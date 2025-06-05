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

console.log("Edge Function: generate-questions is loading");
console.log(`SUPABASE_URL: ${SUPABASE_URL ? "Set" : "Not set"}`);
console.log(`SUPABASE_SERVICE_ROLE_KEY: ${SUPABASE_SERVICE_ROLE_KEY ? "Set" : "Not set"}`);
console.log(`OPENAI_API_KEY: ${OPENAI_API_KEY ? "Set" : "Not set"}`);
console.log(`OPENAI_MODEL: ${OPENAI_MODEL}`);

if (!OPENAI_API_KEY) {
  console.error("Missing OPENAI_API_KEY environment variable");
}

// Validate Supabase environment variables
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    "Missing required environment variables: " +
    (!SUPABASE_URL ? "SUPABASE_URL " : "") +
    (!SUPABASE_SERVICE_ROLE_KEY ? "SUPABASE_SERVICE_ROLE_KEY" : "")
  );
}
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Define Bloom levels and difficulty levels
const bloomLevels = ["Recall", "Conceptual", "Application", "Analysis"];
const difficultyLevels = ["Easy", "Medium", "Hard"];

// Get the list of misconception tags from the database
async function getMisconceptionTags() {
  console.log("Fetching misconception tags from database");
  const { data, error } = await supabase
    .from("misconceptions")
    .select("tag, explanation");
  
  if (error) {
    console.error("Error fetching misconception tags:", error);
    throw new Error(`Failed to fetch misconceptions: ${error.message}`);
  }
  
  console.log(`Retrieved ${data?.length || 0} misconception tags`);
  return data || [];
}

// Fetch concept-specific content from pdf_pages
async function getConceptContent(conceptId) {
  console.log(`Fetching content for concept: ${conceptId}`);
  
  // First, get the concept's page range and chapter ID
  const { data: conceptData, error: conceptError } = await supabase
    .from("concepts")
    .select("chapter_id, start_page_number, end_page_number")
    .eq("id", conceptId)
    .single();
  
  if (conceptError) {
    console.error("Error fetching concept data:", conceptError);
    throw new Error(`Failed to fetch concept data: ${conceptError.message}`);
  }
  
  if (!conceptData) {
    throw new Error("Concept not found");
  }

  // Handle case where page numbers aren't set
  const startPage = conceptData.start_page_number || 1;
  const endPage = conceptData.end_page_number || 100; // A large number to get all pages if not set
  
  console.log(`Fetching pages ${startPage} to ${endPage} for chapter: ${conceptData.chapter_id}`);
  
  // Fetch only the pages in the concept's range
  const { data: pdfPages, error: pagesError } = await supabase
    .from("pdf_pages")
    .select("page_number, content")
    .eq("chapter_id", conceptData.chapter_id)
    .gte("page_number", startPage)
    .lte("page_number", endPage)
    .order("page_number", { ascending: true });
  
  if (pagesError) {
    console.error("Error fetching concept pages:", pagesError);
    throw new Error(`Failed to fetch concept pages: ${pagesError.message}`);
  }
  
  console.log(`Fetched ${pdfPages?.length || 0} pages for concept`);
  
  // If no pages found within the range, fall back to fetching all chapter pages
  if (!pdfPages || pdfPages.length === 0) {
    console.log("No pages found in specified range. Falling back to full chapter content.");
    const { data: allPages, error: allPagesError } = await supabase
      .from("pdf_pages")
      .select("page_number, content")
      .eq("chapter_id", conceptData.chapter_id)
      .order("page_number", { ascending: true });
      
    if (allPagesError) {
      console.error("Error fetching chapter pages:", allPagesError);
      throw new Error(`Failed to fetch chapter pages: ${allPagesError.message}`);
    }
    
    return allPages ? allPages.map(page => page.content).join("\n\n") : "";
  }
  
  // Combine all content from the pages in the concept's range
  return pdfPages.map(page => page.content).join("\n\n");
}

Deno.serve(async (req: Request) => {
  console.log("Edge Function: generate-questions received a request");
  
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
    
    const { conceptId } = requestData;
    
    if (!conceptId) {
      console.error("Missing conceptId in request");
      return new Response(
        JSON.stringify({ error: "Missing conceptId" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`Processing concept with ID: ${conceptId}`);

    // Get concept details and its chapter
    console.log("Fetching concept and chapter details from database");
    const { data: conceptData, error: conceptError } = await supabase
      .from("concepts")
      .select(`
        id,
        name,
        chapters (
          id,
          title,
          grade,
          subject
        )
      `)
      .eq("id", conceptId)
      .single();

    if (conceptError || !conceptData) {
      console.error("Concept not found:", conceptError);
      return new Response(
        JSON.stringify({ error: "Concept not found", details: conceptError }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("Concept details retrieved:", conceptData);

    // Get the chapter ID
    const chapterId = conceptData.chapters.id;
    console.log(`Associated chapter ID: ${chapterId}`);

    // Fetch content specific to this concept
    const conceptContent = await getConceptContent(conceptId);
    console.log(`Concept content length: ${conceptContent.length} characters`);

    // Get misconception tags
    const misconceptionTags = await getMisconceptionTags();
    console.log(`Available misconception tags: ${misconceptionTags.map(m => m.tag).join(", ")}`);

    // Generate questions for each Bloom level and difficulty level
    const generatedQuestions = [];
    
    // Create a seed value based on concept name to increase question variety
    const conceptNameSeed = conceptData.name.length;
    
    for (const bloomLevel of bloomLevels) {
      for (const difficulty of difficultyLevels) {
        // Vary the topic slightly for each combination to prevent repetition
        const bloomIndex = bloomLevels.indexOf(bloomLevel);
        const difficultyIndex = difficultyLevels.indexOf(difficulty);
        const combinationIndex = bloomIndex * difficultyLevels.length + difficultyIndex + 1;
        
        console.log(`Generating question for: ${bloomLevel} - ${difficulty} (combination ${combinationIndex})`);
        
        // Call OpenAI API to generate questions
        const generationPrompt = `
          You are an educational content specialist tasked with creating high-quality practice questions.
          
          Chapter: ${conceptData.chapters.title}
          Grade: ${conceptData.chapters.grade}
          Subject: ${conceptData.chapters.subject}
          Concept: ${conceptData.name}
          Bloom Level: ${bloomLevel}
          Difficulty: ${difficulty}
          Question Number: ${combinationIndex} of 12
          
          Please create one multiple-choice question with the following specifications:
          
          - Bloom's Taxonomy Level: ${bloomLevel}
          - Difficulty Level: ${difficulty}
          - Include a question stem
          - 4 answer options (A, B, C, D)
          - Mark the correct answer
          - For incorrect options, assign one of these misconception tags: ${misconceptionTags.map(m => m.tag).join(", ")}
          
          IMPORTANT:
          - You MUST use ONLY the provided misconception tags, do not invent new ones.
          - The correct option should have NULL as the misconceptionTag.
          - Each incorrect option should have one of the exact misconception tags listed above.
          - Do not add spaces or modify the misconception tags in any way.
          - Format your tags exactly as provided with dashes, not spaces.
          - AVOID REPETITIVE QUESTIONS - make this question different from others
          - DO NOT create the same question as earlier combinations
          - Each question should test a different aspect of the concept
          - Ensure the question is TRULY at the specified Bloom level and difficulty
          
          IMPORTANT GUIDELINES FOR ${conceptData.chapters.subject.toUpperCase()} QUESTIONS:
          - Questions must be grade-appropriate for ${conceptData.chapters.grade}th grade
          - Ensure mathematical accuracy if creating math questions
          - Use clear, concise language appropriate for the grade level
          - Questions must directly relate to the concept content provided
          - Base questions on specific facts or information from the content, not general knowledge
          - Questions should assess understanding of important ideas in the content
          - Include specific examples from the content when appropriate
          - For math questions, double-check all calculations and ensure answers are correct
          - Show your reasoning when creating math questions to verify correctness
          - For science questions, ensure scientific accuracy and appropriate terminology
          
          IMPORTANT:
          - You MUST use ONLY the provided misconception tags, do not invent new ones.
          - The correct option should have NULL as the misconceptionTag.
          - Each incorrect option should have one of the exact misconception tags listed above.
          - Do not add spaces or modify the misconception tags in any way.
          - Format your tags exactly as provided with dashes, not spaces.
          
          REASONING (think step by step before creating the question):
          1. First, identify the key points about "${conceptData.name}" in the provided content
          2. Consider what would be an appropriate ${bloomLevel}-level question at ${difficulty} difficulty
          3. For math questions, work through the problem step-by-step to ensure the correct answer is accurate
          4. Formulate a clear question stem that directly relates to the content
          5. Create one correct answer and three plausible but incorrect options
          6. Assign appropriate misconception tags that reflect WHY each incorrect option might be chosen
          
          Return the question in the following JSON format:
          {
            "question": {
              "stem": "Question text here",
              "options": [
                {
                  "text": "Option A text",
                  "isCorrect": true,
                  "misconceptionTag": null
                },
                {
                  "text": "Option B text",
                  "isCorrect": false,
                  "misconceptionTag": "one-of-the-misconception-tags"
                },
                {
                  "text": "Option C text",
                  "isCorrect": false,
                  "misconceptionTag": "one-of-the-misconception-tags"
                },
                {
                  "text": "Option D text",
                  "isCorrect": false,
                  "misconceptionTag": "one-of-the-misconception-tags"
                }
              ]
            }
          }
          
          Here's the concept content for reference. Use this to create accurate and relevant questions:
          
          ${conceptContent}
        `;

        console.log("Sending request to OpenAI API");
        console.log(`Prompt length: ${generationPrompt.length} characters`);

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
                content: "You are an educational content specialist who creates high-quality practice questions with particular attention to accuracy in math and science.",
              },
              {
                role: "user",
                content: generationPrompt,
              },
            ],
            temperature: 0.5 + (combinationIndex * 0.05), // Vary temperature slightly to increase diversity
          }),
        });

        console.log(`OpenAI API response status: ${openAIResponse.status}`);
        
        if (!openAIResponse.ok) {
          const errorText = await openAIResponse.text();
          console.error(`OpenAI API error: ${openAIResponse.status} - ${errorText}`);
          continue; // Skip this iteration if API call fails
        }

        const openAIData = await openAIResponse.json();
        console.log("OpenAI API response received");
        console.log("Full OpenAI response data:", JSON.stringify(openAIData));
        
        if (!openAIData.choices || openAIData.choices.length === 0) {
          console.error("No choices returned from OpenAI API");
          continue; // Skip this iteration if API call fails
        }

        // Parse the generated question
        const questionText = openAIData.choices[0].message.content;
        console.log("Raw question text from OpenAI:", questionText);
        
        let questionData;
        
        try {
          // Try to parse the JSON directly from the response
          console.log("Attempting to parse question JSON directly");
          questionData = JSON.parse(questionText);
          console.log("Successfully parsed question JSON:", JSON.stringify(questionData));
        } catch (e) {
          console.error("Direct JSON parsing failed:", e);
          console.log("Attempting to extract JSON from text using regex");
          
          // If direct parsing fails, try to extract JSON from text
          const jsonMatch = questionText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            try {
              questionData = JSON.parse(jsonMatch[0]);
              console.log("Successfully extracted and parsed JSON:", JSON.stringify(questionData));
            } catch (extractError) {
              console.error("Failed to extract JSON from response:", extractError);
              continue; // Skip this iteration if parsing fails
            }
          } else {
            console.error("Could not find JSON pattern in response");
            continue; // Skip this iteration if parsing fails
          }
        }

        if (!questionData || !questionData.question || !questionData.question.options) {
          console.error("Invalid question data structure:", questionData);
          continue; // Skip if data structure is invalid
        }

        // Sanitize misconception tags to ensure they match existing tags
        questionData.question.options.forEach((option: any) => {
          if (!option.isCorrect && option.misconceptionTag) {
            // Replace spaces with dashes and ensure it's in the right format
            const sanitizedTag = option.misconceptionTag
              .replace(/\s+/g, '-') // Replace spaces with dashes
              .replace(/[^a-z0-9-]/gi, '') // Remove any non-alphanumeric or dash characters
              .toLowerCase(); // Ensure lowercase
            
            // Check if this sanitized tag exists in our misconception tags
            const tagExists = misconceptionTags.some(t => t.tag === sanitizedTag);
            
            if (!tagExists) {
              // If tag doesn't exist, use a default tag
              option.misconceptionTag = "conceptual-misunderstanding";
            } else {
              option.misconceptionTag = sanitizedTag;
            }
          }
        });

        // Insert the question into the database
        console.log("Inserting question into database:", {
          concept_id: conceptId,
          bloom_level: bloomLevel,
          difficulty: difficulty,
          stem: questionData.question.stem
        });

        const { data: insertedQuestion, error: questionError } = await supabase
          .from("questions")
          .insert({
            concept_id: conceptId,
            bloom_level: bloomLevel,
            difficulty: difficulty,
            stem: questionData.question.stem,
          })
          .select()
          .single();

        if (questionError || !insertedQuestion) {
          console.error("Error inserting question:", questionError);
          continue; // Skip this iteration if question insertion fails
        }

        console.log("Question inserted successfully:", insertedQuestion);

        // Insert the options for this question
        const optionsToInsert = questionData.question.options.map((option: any) => ({
          question_id: insertedQuestion.id,
          text: option.text,
          is_correct: option.isCorrect,
          misconception_tag: option.isCorrect ? null : option.misconceptionTag,
        }));

        console.log("Inserting options into database:", optionsToInsert);

        const { data: insertedOptions, error: optionsError } = await supabase
          .from("options")
          .insert(optionsToInsert)
          .select();

        if (optionsError) {
          console.error("Error inserting options:", optionsError);
        } else {
          console.log("Options inserted successfully:", insertedOptions);
          generatedQuestions.push({
            ...insertedQuestion,
            options: insertedOptions,
          });
        }
      }
    }

    console.log(`Successfully generated ${generatedQuestions.length} questions`);
    return new Response(
      JSON.stringify({
        success: true,
        questions: generatedQuestions,
        count: generatedQuestions.length,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    console.error("Unhandled error in generate-questions function:", error);
    return new Response(
      JSON.stringify({ 
        error: "Internal server error", 
        details: error.message,
        stack: error.stack 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});