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
function extractBasicConcepts(text: string, title: string, totalPages: number) {
  console.log("Using fallback extraction method");
  // Extract sentences that might be conceptual
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
  const filteredSentences = sentences.slice(0, Math.min(10, sentences.length));
  
  // Divide the page range evenly among concepts
  const numConcepts = 5; // We'll create 5 basic concepts
  const pagesPerConcept = Math.max(1, Math.floor(totalPages / numConcepts));
  
  const concepts = [];
  for (let i = 0; i < numConcepts; i++) {
    const startPage = i * pagesPerConcept + 1;
    const endPage = (i === numConcepts - 1) ? totalPages : (i + 1) * pagesPerConcept;
    
    concepts.push({
      name: `${title} - ${i === 0 ? 'Main Concept' : `Key Idea ${i}`}`,
      description: filteredSentences[i] || `Important information from this chapter (part ${i+1})`,
      startPageNumber: startPage,
      endPageNumber: endPage
    });
  }
  
  // Generate some basic misconceptions
  const misconceptions = [
    { tag: 'conceptual-misunderstanding', explanation: `Misunderstanding of core concepts in ${title}` },
    { tag: 'calculation-error', explanation: 'Error in mathematical calculations or procedures' },
    { tag: 'logical-fallacy', explanation: 'Incorrect application of logical reasoning' },
    { tag: 'terminological-confusion', explanation: `Confusion about terminology related to ${title}` }
  ];
  
  return { concepts, misconceptions };
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
    const totalPages = pdfPages.length;

    // Create a map of page summaries for context
    const pageSummaries = pdfPages.map(page => 
      `Page ${page.page_number}: ${page.content.substring(0, 150)}...`
    ).join("\n\n");

    // Combine content from all pages - using the full chapter content
    const combinedContent = pdfPages.map(page => page.content).join("\n\n");
    console.log(`Combined content length: ${combinedContent.length} characters`);
    
    // Extract a small preview of the content for logging
    const contentPreview = combinedContent.length > 200 
      ? combinedContent.substring(0, 200) + "..." 
      : combinedContent;
    console.log(`Content preview: ${contentPreview}`);

    // Extract concepts and misconceptions (with AI if available, otherwise fallback)
    let extractedData;
    
    if (OPENAI_API_KEY) {
      try {
        console.log("Using OpenAI for concept and misconception extraction");
        // Call OpenAI API with enhanced prompt to identify page ranges and generate misconceptions
        const extractionPrompt = `
          You are an educational content specialist. Extract 5-8 key concepts from this chapter and identify the page range where each concept appears. Also, identify 5-10 common misconceptions students might have about these concepts.
          
          Chapter: ${chapterData.title}
          Grade: ${chapterData.grade}
          Subject: ${chapterData.subject}
          Total Pages: ${totalPages}
          
          Page Summaries:
          ${pageSummaries}
          
          Chapter content:
          ${combinedContent}
          
          For each concept, analyze where it first appears and where discussion of it ends. Assign a reasonable page range based on the content.
          
          For misconceptions, consider what students in grades ${Math.max(1, chapterData.grade - 2)} to ${chapterData.grade + 2} might misunderstand about the content. Create tags that are hyphenated (e.g., "fraction-addition-error") and provide a clear explanation of each misconception.
          
          Return ONLY a JSON object with this structure:
          {
            "concepts": [
              {
                "name": "Concept name",
                "description": "Brief explanation of the concept",
                "startPageNumber": 1,
                "endPageNumber": 3
              }
            ],
            "misconceptions": [
              {
                "tag": "hyphenated-misconception-tag",
                "explanation": "Clear explanation of what the misconception is and why students might have it"
              }
            ]
          }
          
          IMPORTANT RULES:
          1. Page numbers must be between 1 and ${totalPages} inclusive
          2. Each concept must have startPageNumber and endPageNumber
          3. Keep page ranges focused and specific - a concept typically spans 2-4 pages
          4. Page ranges can overlap between concepts
          5. Ensure page ranges are accurate and reasonable - don't assign the entire chapter to a single concept
          6. Name concepts clearly and concisely - avoid vague or overly broad names
          7. Misconception tags must be hyphenated, lowercase, and descriptive
          8. Each misconception must have a clear, helpful explanation
          9. Misconceptions should be specific to the chapter content
          10. Include subject-specific misconceptions relevant to ${chapterData.subject}
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
                content: "You are an educational content specialist who extracts key concepts from educational materials, identifies their page ranges, and recognizes common misconceptions.",
              },
              {
                role: "user",
                content: extractionPrompt,
              },
            ],
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
        const responseText = openAIData.choices[0].message.content;
        console.log(`Response text from OpenAI: ${responseText}`);
        
        try {
          extractedData = JSON.parse(responseText);
          console.log("Successfully parsed OpenAI response as JSON:", extractedData);
        } catch (jsonError) {
          console.error("Failed to parse OpenAI response as JSON:", jsonError);
          console.log("Attempting to extract JSON from text...");
          
          // Try to extract JSON from text
          const jsonMatch = responseText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            try {
              extractedData = JSON.parse(jsonMatch[0]);
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
        
        // Validate page ranges
        extractedData.concepts = extractedData.concepts.map(concept => {
          // Ensure page numbers are integers within valid range
          const startPage = Math.max(1, Math.min(totalPages, Math.floor(Number(concept.startPageNumber)) || 1));
          const endPage = Math.max(startPage, Math.min(totalPages, Math.floor(Number(concept.endPageNumber)) || startPage));
          
          return {
            ...concept,
            startPageNumber: startPage,
            endPageNumber: endPage
          };
        });
        
      } catch (aiError) {
        // Fall back to basic extraction if AI fails
        console.error("OpenAI extraction failed:", aiError);
        console.log("Falling back to basic extraction method");
        extractedData = extractBasicConcepts(combinedContent, chapterData.title, totalPages);
      }
    } else {
      // No API key, use basic extraction
      console.log("No OpenAI API key available, using basic extraction");
      extractedData = extractBasicConcepts(combinedContent, chapterData.title, totalPages);
    }

    // Save concepts to database
    console.log("Preparing concepts for database insertion:", extractedData.concepts);
    
    const conceptsToInsert = extractedData.concepts.map((concept) => ({
      chapter_id: chapterId,
      name: concept.name,
      start_page_number: concept.startPageNumber,
      end_page_number: concept.endPageNumber
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

    // Save misconceptions to database (if available)
    if (extractedData.misconceptions && Array.isArray(extractedData.misconceptions)) {
      console.log("Preparing misconceptions for database insertion:", extractedData.misconceptions);
      
      // Process each misconception
      for (const misconception of extractedData.misconceptions) {
        if (!misconception.tag || !misconception.explanation) {
          console.warn("Skipping invalid misconception:", misconception);
          continue;
        }
        
        // Clean the tag to ensure it's properly formatted
        const cleanTag = misconception.tag.toLowerCase().trim().replace(/\s+/g, '-');
        
        // Upsert the misconception (insert if not exists, update if exists)
        const { error: misconceptionError } = await supabase
          .from("misconceptions")
          .upsert({
            tag: cleanTag,
            explanation: misconception.explanation
          });
          
        if (misconceptionError) {
          console.error(`Failed to save misconception "${cleanTag}":`, misconceptionError);
          // Continue processing other misconceptions even if this one fails
        } else {
          console.log(`Successfully inserted/updated misconception: ${cleanTag}`);
        }
      }
    } else {
      console.log("No misconceptions data available from extraction");
    }

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
        misconceptionsCount: extractedData.misconceptions?.length || 0
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