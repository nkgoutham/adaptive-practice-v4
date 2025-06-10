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

// Get previously generated questions to avoid repetition
async function getPreviouslyGeneratedQuestions(conceptId) {
  console.log(`Fetching existing questions for concept: ${conceptId}`);
  
  const { data: questions, error } = await supabase
    .from("questions")
    .select(`
      id,
      stem,
      bloom_level,
      difficulty,
      options (text, is_correct)
    `)
    .eq("concept_id", conceptId);
  
  if (error) {
    console.error("Error fetching existing questions:", error);
    throw new Error(`Failed to fetch existing questions: ${error.message}`);
  }
  
  console.log(`Found ${questions?.length || 0} existing questions`);
  return questions || [];
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
    
    const { conceptId, regenerateContext } = requestData;
    
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
    if (regenerateContext) {
      console.log(`Regeneration context provided: ${regenerateContext}`);
    }

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
    
    // Get previously generated questions to avoid repetition
    const existingQuestions = await getPreviouslyGeneratedQuestions(conceptId);
    console.log(`Found ${existingQuestions.length} existing questions to avoid repetition`);
    
    // Prepare existing questions text for context
    const existingQuestionsText = existingQuestions.map(q => 
      `Question: ${q.stem}\nBloom: ${q.bloom_level}\nDifficulty: ${q.difficulty}\nOptions: ${q.options.map(o => o.text).join("; ")}`
    ).join("\n\n");

    // Generate questions for each Bloom level and difficulty level
    const generatedQuestions = [];
    
    // Keep track of generated question stems to avoid duplication
    const generatedStems = new Set();
    
    // Create a seed value based on concept name to increase question variety
    const conceptNameSeed = conceptData.name.length;
    
    for (const bloomLevel of bloomLevels) {
      for (const difficultyLevel of difficultyLevels) {
        // Vary the topic slightly for each combination to prevent repetition
        const bloomIndex = bloomLevels.indexOf(bloomLevel);
        const difficultyIndex = difficultyLevels.indexOf(difficultyLevel);
        const combinationIndex = bloomIndex * difficultyLevels.length + difficultyIndex + 1;
        
        console.log(`Generating question for: ${bloomLevel} - ${difficultyLevel} (combination ${combinationIndex})`);
        
        // Call OpenAI API to generate questions
        const generationPrompt = `
          You are an educational content specialist tasked with creating high-quality, UNIQUE practice questions.
          
          Chapter: ${conceptData.chapters.title}
          Grade: ${conceptData.chapters.grade}
          Subject: ${conceptData.chapters.subject}
          Concept: ${conceptData.name}
          Bloom Level: ${bloomLevel}
          Difficulty: ${difficultyLevel}
          Question Number: ${combinationIndex} of 12
          
          *** CRITICAL REQUIREMENT: QUESTION UNIQUENESS ***
          Your primary task is to create a question that is SIGNIFICANTLY DIFFERENT from any others for this concept. 
          Each question MUST test a different aspect, application, or facet of the concept.
          It is ABSOLUTELY ESSENTIAL that you avoid creating questions that are merely rephrased versions of the same underlying question.
          
          ${regenerateContext ? `\n*** TEACHER INSTRUCTIONS FOR REGENERATION ***\n${regenerateContext}\n` : ''}
          
          Please create one multiple-choice question with the following specifications:
          
          - Bloom's Taxonomy Level: ${bloomLevel}
          - Difficulty Level: ${difficultyLevel}
          - Include a question stem
          - 4 answer options (A, B, C, D)
          - Mark the correct answer
          - For incorrect options, assign one of these misconception tags: ${misconceptionTags.map(m => m.tag).join(", ")}
          
          IMPORTANT QUESTION TYPE GUIDELINES BY BLOOM'S LEVEL:
          - Recall: Direct knowledge recall questions testing memory of facts, terms, or principles.
          - Conceptual: Questions that test understanding of relationships between concepts.
          - Application: MUST include a brief realistic scenario or context where the student applies knowledge to a new situation.
          - Analysis: MUST include a complex scenario or data to analyze with multiple elements to consider.
          
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
          
          EXISTING QUESTIONS TO AVOID DUPLICATING:
          ${existingQuestionsText}
          
          REASONING (think step by step before creating the question):
          1. First, identify the key points about "${conceptData.name}" in the provided content
          2. Consider what would be an appropriate ${bloomLevel}-level question at ${difficultyLevel} difficulty
          3. Review the existing questions and ensure you're testing a DIFFERENT aspect of the concept
          4. For Application and Analysis levels, develop a unique context or scenario
          5. For math questions, work through the problem step-by-step to ensure the correct answer is accurate
          6. Formulate a clear question stem that directly relates to the content
          7. Create one correct answer and three plausible but incorrect options
          8. Assign appropriate misconception tags that reflect WHY each incorrect option might be chosen
          9. FINAL UNIQUENESS CHECK: Compare your question to the existing ones - if it's too similar, start over with a different aspect
          
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
                content: "You are an educational content specialist who creates high-quality, diverse, and unique practice questions. You prioritize question uniqueness and relevance over quantity. For each concept, you create questions that test different aspects, applications, or facets of the concept.",
              },
              {
                role: "user",
                content: generationPrompt,
              },
            ],
            // temperature: 0.7, // Balanced creativity
            // top_p: 0.9, // Diverse token sampling
            // frequency_penalty: 0.7, // Reduce repetition of phrases
            // presence_penalty: 0.7, // Encourage introducing new ideas
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
        
        // Check if this question stem is too similar to existing ones
        const newStem = questionData.question.stem.toLowerCase().trim();
        let isDuplicate = false;
        
        // Check against already generated questions in this session
        if (generatedStems.has(newStem)) {
          console.log("Skipping duplicate question stem (exact match)");
          isDuplicate = true;
        }
        
        // Check for high similarity with existing questions
        for (const existingStem of generatedStems) {
          // Simple similarity check - can be enhanced with more sophisticated methods
          const similarityScore = calculateSimilarity(newStem, existingStem);
          if (similarityScore > 0.7) { // 70% similarity threshold
            console.log(`Skipping similar question (${Math.round(similarityScore * 100)}% similar)`);
            isDuplicate = true;
            break;
          }
        }
        
        // Check against questions from database
        for (const existingQuestion of existingQuestions) {
          const existingStem = existingQuestion.stem.toLowerCase().trim();
          const similarityScore = calculateSimilarity(newStem, existingStem);
          if (similarityScore > 0.7) {
            console.log(`Skipping question similar to database question (${Math.round(similarityScore * 100)}% similar)`);
            isDuplicate = true;
            break;
          }
        }
        
        if (isDuplicate) {
          console.log("Skipping duplicate/similar question");
          continue; // Skip this question and try another combination
        }
        
        // Add to generated stems set
        generatedStems.add(newStem);

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
          difficulty: difficultyLevel,
          stem: questionData.question.stem
        });

        const { data: insertedQuestion, error: questionError } = await supabase
          .from("questions")
          .insert({
            concept_id: conceptId,
            bloom_level: bloomLevel,
            difficulty: difficultyLevel,
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

// Helper function to calculate similarity between two strings
// This is a simple implementation that could be enhanced
function calculateSimilarity(str1: string, str2: string): number {
  // Simple Jaccard similarity using word sets
  const words1 = new Set(str1.toLowerCase().split(/\s+/).filter(w => w.length > 3));
  const words2 = new Set(str2.toLowerCase().split(/\s+/).filter(w => w.length > 3));
  
  // Calculate intersection
  const intersection = new Set([...words1].filter(word => words2.has(word)));
  
  // Calculate union
  const union = new Set([...words1, ...words2]);
  
  // Return Jaccard similarity
  return union.size === 0 ? 0 : intersection.size / union.size;
}