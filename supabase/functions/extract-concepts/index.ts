import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-client-info",
};

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const OPENAI_MODEL = Deno.env.get("OPENAI_MODEL") || "gpt-3.5-turbo";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

console.log("Edge Function: extract-concepts is loading");
console.log(`SUPABASE_URL: ${SUPABASE_URL ? "Set" : "Not set"}`);
console.log(`SUPABASE_SERVICE_ROLE_KEY: ${SUPABASE_SERVICE_ROLE_KEY ? "Set" : "Not set"}`);
console.log(`OPENAI_API_KEY: ${OPENAI_API_KEY ? "Set" : "Not set"}`);
console.log(`OPENAI_MODEL: ${OPENAI_MODEL}`);

// Create Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Simple fallback function for extracting concepts without AI
function extractBasicConcepts(text, title) {
  console.log("Using fallback extraction method");
  // Extract sentences that might be conceptual
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
  const filteredSentences = sentences.slice(0, Math.min(10, sentences.length));
  
  return {
    concepts: [
      { name: `${title} - Main Concept`, description: "Primary concept from this chapter" },
      { name: `${title} - Key Idea 1`, description: filteredSentences[0] || "Important information from this chapter" },
      { name: `${title} - Key Idea 2`, description: filteredSentences[1] || "Another important concept from this chapter" },
      { name: `${title} - Key Idea 3`, description: filteredSentences[2] || "Additional concept from this chapter" },
      { name: `${title} - Application`, description: "How to apply concepts from this chapter" }
    ]
  };
}

Deno.serve(async (req: Request) => {
  console.log("Edge Function: extract-concepts received a request");
  
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    console.log("Processing OPTIONS request (CORS preflight)");
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    console.log("Starting to process POST request");
    
    // Parse request
    const body = await req.text();
    console.log(`Request body: ${body}`);
    
    let requestData;
    try {
      requestData = JSON.parse(body);
      console.log("Parsed request data:", requestData);
    } catch (parseError) {
      console.error("Failed to parse request JSON:", parseError);
      return new Response(
        JSON.stringify({ error: "Invalid JSON in request body", details: parseError.message }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    
    const { chapterId } = requestData;
    
    if (!chapterId) {
      console.error("Missing chapterId in request");
      return new Response(
        JSON.stringify({ error: "Missing chapterId" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`Processing chapter with ID: ${chapterId}`);

    // Get chapter details
    console.log("Fetching chapter details from database");
    const { data: chapterData, error: chapterError } = await supabase
      .from("chapters")
      .select("title, grade, subject")
      .eq("id", chapterId)
      .single();

    if (chapterError) {
      console.error("Chapter not found:", chapterError);
      return new Response(
        JSON.stringify({ error: "Chapter not found", details: chapterError.message }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("Chapter details retrieved:", chapterData);

    // Fetch pages content
    console.log("Fetching PDF pages from database");
    const { data: pdfPages, error: pagesError } = await supabase
      .from("pdf_pages")
      .select("page_number, content")
      .eq("chapter_id", chapterId)
      .order("page_number", { ascending: true });
    
    if (pagesError) {
      console.error("Error fetching PDF pages:", pagesError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch PDF pages", details: pagesError.message }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    
    if (!pdfPages || pdfPages.length === 0) {
      console.error("No PDF pages found for this chapter");
      return new Response(
        JSON.stringify({ error: "No PDF pages found for this chapter" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`Found ${pdfPages.length} PDF pages for chapter`);

    // Combine content from all pages - using the full chapter content
    const combinedContent = pdfPages.map(page => page.content).join("\n\n");
    console.log(`Combined content length: ${combinedContent.length} characters`);
    
    // Extract a small preview of the content for logging
    const contentPreview = combinedContent.length > 200 
      ? combinedContent.substring(0, 200) + "..." 
      : combinedContent;
    console.log(`Content preview: ${contentPreview}`);

    // Extract concepts (with AI if available, otherwise fallback)
    let conceptsData;
    
    if (OPENAI_API_KEY) {
      try {
        console.log("Using OpenAI for concept extraction");
        // Call OpenAI API
        const extractionPrompt = `
          You are an educational content specialist. Extract 5-8 key concepts from this chapter:
          
          Chapter: ${chapterData.title}
          Grade: ${chapterData.grade}
          Subject: ${chapterData.subject}
          
          Chapter content:
          ${combinedContent}
          
          Return ONLY a JSON object with this structure:
          {
            "concepts": [
              {
                "name": "Concept name",
                "description": "Brief explanation of the concept"
              }
            ]
          }
        `;

        console.log("Sending request to OpenAI API");
        console.log(`Prompt length: ${extractionPrompt.length} characters`);
        
        const openAIResponse = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: OPENAI_MODEL,
            messages: [
              {
                role: "system",
                content: "You are an educational content specialist who extracts key concepts from educational materials.",
              },
              {
                role: "user",
                content: extractionPrompt,
              },
            ],
            temperature: 0.3,
          }),
        });

        console.log(`OpenAI API response status: ${openAIResponse.status}`);
        
        if (!openAIResponse.ok) {
          const errorText = await openAIResponse.text();
          console.error(`OpenAI API error: ${openAIResponse.status} - ${errorText}`);
          throw new Error(`OpenAI API error: ${openAIResponse.status} - ${errorText}`);
        }

        const openAIData = await openAIResponse.json();
        console.log("OpenAI API response received");
        
        if (!openAIData.choices || openAIData.choices.length === 0) {
          console.error("No choices returned from OpenAI API:", openAIData);
          throw new Error("No choices returned from OpenAI API");
        }

        // Parse the response
        const conceptsText = openAIData.choices[0].message.content;
        console.log(`Concepts text from OpenAI: ${conceptsText}`);
        
        try {
          conceptsData = JSON.parse(conceptsText);
          console.log("Successfully parsed OpenAI response as JSON:", conceptsData);
        } catch (jsonError) {
          console.error("Failed to parse OpenAI response as JSON:", jsonError);
          console.log("Attempting to extract JSON from text...");
          
          // Try to extract JSON from text
          const jsonMatch = conceptsText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            try {
              conceptsData = JSON.parse(jsonMatch[0]);
              console.log("Successfully extracted and parsed JSON from response");
            } catch (extractError) {
              console.error("Failed to extract JSON from response:", extractError);
              throw new Error("Could not parse concepts JSON from response");
            }
          } else {
            console.error("Could not find JSON pattern in response");
            throw new Error("Could not find JSON pattern in response");
          }
        }
      } catch (aiError) {
        // Fall back to basic extraction if AI fails
        console.error("OpenAI extraction failed:", aiError);
        console.log("Falling back to basic extraction method");
        conceptsData = extractBasicConcepts(combinedContent, chapterData.title);
      }
    } else {
      // No API key, use basic extraction
      console.log("No OpenAI API key available, using basic extraction");
      conceptsData = extractBasicConcepts(combinedContent, chapterData.title);
    }

    // Save concepts to database
    console.log("Preparing concepts for database insertion:", conceptsData.concepts);
    
    const conceptsToInsert = conceptsData.concepts.map((concept) => ({
      chapter_id: chapterId,
      name: concept.name,
    }));

    console.log("Inserting concepts into database:", conceptsToInsert);
    const { data: insertedConcepts, error: insertError } = await supabase
      .from("concepts")
      .insert(conceptsToInsert)
      .select();

    if (insertError) {
      console.error("Failed to save concepts:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to save concepts", details: insertError.message }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("Successfully inserted concepts:", insertedConcepts);

    // Update chapter status
    console.log("Updating chapter status to 'completed'");
    const { error: updateError } = await supabase
      .from("chapters")
      .update({ processing_status: "completed" })
      .eq("id", chapterId);
      
    if (updateError) {
      console.error("Failed to update chapter status:", updateError);
      // Continue anyway since concepts were inserted successfully
    }

    console.log("Concept extraction completed successfully");
    return new Response(
      JSON.stringify({
        success: true,
        concepts: insertedConcepts,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    console.error("Unhandled error in extract-concepts function:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: error.message, stack: error.stack }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});