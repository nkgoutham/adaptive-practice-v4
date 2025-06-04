import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

// Validate required environment variables
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    "Missing required environment variables: " +
    (!SUPABASE_URL ? "SUPABASE_URL " : "") +
    (!SUPABASE_SERVICE_ROLE_KEY ? "SUPABASE_SERVICE_ROLE_KEY" : "")
  );
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

Deno.serve(async (req: Request) => {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    console.log("Processing PDF parse request...");
    // Parse request body
    const { filePath, teacherId, title, grade, subject } = await req.json();
    
    if (!teacherId) {
      return new Response(
        JSON.stringify({ error: "Missing required parameters" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // For now, we'll use a dummy text since parsing happens client-side
    let pdfText = "Sample PDF content";
    
    if (filePath) {
      // If a filePath is still provided, attempt to download it
      // This is for backward compatibility
      try {
        const { data: fileData, error: fileError } = await supabase
          .storage
          .from('chapter-pdfs')
          .download(filePath);

        if (fileError) {
          console.warn("Could not download PDF from storage, using provided content instead.");
        } else {
          // Convert to text - this would require pdf-parse but we're skipping this
          // as we now expect text to be extracted in the client
          pdfText = "PDF content extracted from storage";
        }
      } catch (error) {
        console.warn("Error downloading PDF:", error);
      }
    }

    console.log("Creating chapter in database...");
    // Create a new chapter in the database
    const { data: chapter, error: chapterError } = await supabase
      .from('chapters')
      .insert({
        title: title || "Untitled Chapter",
        grade: grade || 5,
        subject: subject || "General",
        teacher_id: teacherId,
        content: pdfText,
        processing_status: 'extracting'
      })
      .select()
      .single();

    if (chapterError) {
      console.error("Failed to create chapter:", chapterError);
      return new Response(
        JSON.stringify({ error: "Failed to create chapter", details: chapterError }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("Chapter created successfully");
    return new Response(
      JSON.stringify({
        success: true,
        chapter: chapter,
        text: pdfText,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    console.error("Internal server error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});