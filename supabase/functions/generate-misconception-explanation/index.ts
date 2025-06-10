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

console.log("Edge Function: generate-misconception-explanation is loading");
console.log(`SUPABASE_URL: ${SUPABASE_URL ? "Set" : "Not set"}`);
console.log(`SUPABASE_SERVICE_ROLE_KEY: ${SUPABASE_SERVICE_ROLE_KEY ? "Set" : "Not set"}`);
console.log(`OPENAI_API_KEY: ${OPENAI_API_KEY ? "Set" : "Not set"}`);
console.log(`OPENAI_MODEL: ${OPENAI_MODEL}`);

if (!OPENAI_API_KEY) {
  console.error("Missing OPENAI_API_KEY environment variable");
}

// Create Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Helper function to get a fallback explanation when AI generation fails
function getFallbackExplanation(misconceptionTag: string): string {
  const fallbacks: Record<string, string> = {
    "conceptual-misunderstanding": "It's great that you're thinking about this concept! When we approach this type of problem, it helps to focus on the fundamental principles. Consider how the core idea applies specifically in this context, and you'll find that another approach leads to the correct answer.",
    "calculation-error": "You're on the right track with your understanding! Sometimes in calculations, small details can lead us to different results. Try reviewing the steps of your calculation to see if there might be another way to solve this problem.",
    "logical-fallacy": "Your thought process shows good engagement with the material! When working through logical problems, it can be helpful to check each step carefully. Consider the relationship between the different elements in this problem.",
    "terminological-confusion": "You're demonstrating good thinking here! Sometimes similar terms can be confusing. Let's clarify the specific meaning of the key terms in this question to help identify the correct answer.",
    "scope-error": "Your answer shows you're engaging with the material! It's important to consider the specific context where these principles apply. Think about whether this particular scenario matches the conditions needed for this concept.",
    "causation-correlation": "That's thoughtful reasoning! When examining relationships between events or factors, it's helpful to distinguish between correlation (things happening together) and causation (one thing causing another). Consider what evidence would be needed to determine a cause.",
    "overgeneralization": "You're showing good understanding of the general concept! Some principles that work in many situations have specific exceptions or limitations. Consider whether this particular case might be one where the general rule needs modification.",
    "contextual-application": "You've got a good grasp of the concept! Sometimes the context changes how we apply certain principles. Think about what specific aspects of this scenario might affect which approach works best.",
  };
  
  return fallbacks[misconceptionTag] || 
    "It's great that you're working through this problem! Consider approaching it from a different angle. Looking at the fundamental principles behind this concept can help clarify which answer best fits the question.";
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    // Parse request
    const { questionId, selectedOptionId, misconceptionTag } = await req.json();
    
    if (!questionId || !selectedOptionId) {
      return new Response(
        JSON.stringify({ error: "Missing required parameters" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`Processing explanation request for question: ${questionId}, option: ${selectedOptionId}`);
    
    // 1. Get the question details with options
    const { data: question, error: questionError } = await supabase
      .from("questions")
      .select(`
        id,
        stem,
        bloom_level,
        difficulty,
        concept_id,
        options (
          id,
          text,
          is_correct,
          misconception_tag
        )
      `)
      .eq("id", questionId)
      .single();
    
    if (questionError || !question) {
      console.error("Error fetching question:", questionError);
      return new Response(
        JSON.stringify({ 
          error: "Failed to fetch question details", 
          explanation: getFallbackExplanation(misconceptionTag)
        }),
        {
          status: 200, // Still return 200 so the UI can show the fallback
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    
    // 2. Get the selected option
    const selectedOption = question.options.find(o => o.id === selectedOptionId);
    if (!selectedOption) {
      console.error("Selected option not found");
      return new Response(
        JSON.stringify({ 
          error: "Selected option not found", 
          explanation: getFallbackExplanation(misconceptionTag)
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    
    // 3. Get the correct option for comparison
    const correctOption = question.options.find(o => o.is_correct);
    if (!correctOption) {
      console.error("No correct option found for this question");
      return new Response(
        JSON.stringify({ 
          error: "No correct option found", 
          explanation: getFallbackExplanation(misconceptionTag)
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    
    // 4. Get the concept details
    const { data: concept, error: conceptError } = await supabase
      .from("concepts")
      .select(`
        id,
        name,
        chapter_id
      `)
      .eq("id", question.concept_id)
      .single();
    
    if (conceptError || !concept) {
      console.error("Error fetching concept:", conceptError);
      return new Response(
        JSON.stringify({ 
          error: "Failed to fetch concept details", 
          explanation: getFallbackExplanation(misconceptionTag)
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    
    // 5. Get relevant chapter content
    const { data: pages, error: pagesError } = await supabase
      .from("pdf_pages")
      .select("content")
      .eq("chapter_id", concept.chapter_id)
      .limit(3); // Limit to first few pages to avoid context overflow
    
    const chapterContent = pages && pages.length > 0 
      ? pages.map(p => p.content).join("\n\n")
      : "";
    
    // Truncate chapter content if it's too long
    const truncatedContent = chapterContent.length > 2000 
      ? chapterContent.substring(0, 2000) + "..." 
      : chapterContent;
    
    // 6. Generate explanation with OpenAI
    if (!OPENAI_API_KEY) {
      console.error("OpenAI API key not available");
      return new Response(
        JSON.stringify({ 
          error: "OpenAI API key not available", 
          explanation: getFallbackExplanation(misconceptionTag)
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    
    try {
      const prompt = `
        I need to create a helpful and non-judgmental explanation for a student who has selected an incorrect answer on a practice question.

        QUESTION: ${question.stem}
        
        OPTIONS:
        ${question.options.map(o => `- ${o.text} ${o.is_correct ? "(CORRECT ANSWER)" : ""}`).join("\n")}
        
        STUDENT SELECTED: ${selectedOption.text}
        
        CORRECT ANSWER: ${correctOption.text}
        
        MISCONCEPTION TYPE: ${misconceptionTag || selectedOption.misconception_tag || "general misunderstanding"}
        
        CONCEPT: ${concept.name}
        
        RELEVANT CONTENT:
        ${truncatedContent || "Not available"}
        
        Instructions:
        1. Create a brief, clear explanation (3-5 sentences) that helps the student understand why their answer is incorrect
        2. The explanation should focus on clarifying the misconception
        3. Be encouraging and non-judgmental - the goal is to help the student learn
        4. Use simple language appropriate for a student at the indicated level
        5. Include a constructive insight that will help them understand similar problems in the future
        6. DO NOT simply state that their answer is wrong
        7. DO NOT use phrases like "you're mistaken" or "your error"
        8. DO NOT reveal the answer directly - guide them to understanding
        
        Return ONLY the explanation text without any additional formatting or notes. The explanation should be in a conversational, supportive tone.
      `;

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
              content: "You are an educational assistant that helps students understand misconceptions in a supportive, non-judgmental way."
            },
            {
              role: "user",
              content: prompt
            }
          ],
          // temperature: 0.7,
          max_tokens: 250,
        }),
      });

      if (!openAIResponse.ok) {
        const errorText = await openAIResponse.text();
        console.error(`OpenAI API error: ${openAIResponse.status} - ${errorText}`);
        throw new Error(`OpenAI API error: ${openAIResponse.status}`);
      }

      const openAIData = await openAIResponse.json();
      const explanation = openAIData.choices[0].message.content.trim();

      // Return the generated explanation
      return new Response(
        JSON.stringify({ explanation }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    } catch (aiError) {
      console.error("Error generating explanation with OpenAI:", aiError);
      
      // Return a fallback explanation based on the misconception tag
      return new Response(
        JSON.stringify({ 
          error: "Failed to generate explanation", 
          explanation: getFallbackExplanation(misconceptionTag || selectedOption.misconception_tag) 
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
  } catch (error) {
    console.error("Unhandled error:", error);
    return new Response(
      JSON.stringify({ 
        error: "Internal server error", 
        explanation: "It's great that you're working through this problem! Consider approaching it from a different angle. Understanding the core principles will help clarify which answer best fits the question."
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        
      }
    );
  }
});