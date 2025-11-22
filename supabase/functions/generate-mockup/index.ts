import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Validation schemas
const VALID_PRODUCT_TYPES = ['t-shirt', 't-shirts', 'hoodie', 'hoodies', 'polo', 'jacket', 'jackets', 'sweatshirt', 'caps', 'bags', 'custom'];
const VALID_DESIGN_SIZES = ['A2', 'A3', 'A4', 'small', 'medium', 'large'];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user has buyer role (server-side authorization)
    const { data: userRole } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (!userRole || userRole.role !== 'buyer') {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Buyer role required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { frontDesignImage, backDesignImage, productType, designSize } = await req.json();

    // Input validation
    if (!frontDesignImage || typeof frontDesignImage !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Front design image is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!productType || typeof productType !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Invalid productType parameter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!VALID_PRODUCT_TYPES.includes(productType.toLowerCase())) {
      return new Response(
        JSON.stringify({ error: `Invalid productType. Must be one of: ${VALID_PRODUCT_TYPES.join(', ')}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!designSize || typeof designSize !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Invalid designSize parameter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!VALID_DESIGN_SIZES.includes(designSize)) {
      return new Response(
        JSON.stringify({ error: `Invalid designSize. Must be one of: ${VALID_DESIGN_SIZES.join(', ')}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Sanitize inputs
    const sanitizedProductType = productType.toLowerCase().trim();
    const sanitizedDesignSize = designSize.trim();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Generate front mockup using the uploaded design
    const frontPrompt = `Apply this design to the front of a ${sanitizedProductType}. 
    Create a professional product mockup with the design placed on the ${sanitizedProductType}.
    The ${sanitizedProductType} should be displayed on a clean white background, centered, high quality studio lighting.
    Design placement follows ${sanitizedDesignSize} proportions.
    Style: Professional e-commerce product photo, minimalist, modern.
    The ${sanitizedProductType} should be photorealistic with visible fabric texture.`;

    const frontResponse = await fetch(
      'https://ai.gateway.lovable.dev/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash-image-preview',
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: frontPrompt },
                { type: 'image_url', image_url: { url: frontDesignImage } }
              ]
            }
          ],
          modalities: ['image', 'text']
        }),
      }
    );

    if (!frontResponse.ok) {
      const errorText = await frontResponse.text();
      
      if (frontResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (frontResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please add credits to your workspace.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`Lovable AI error: ${frontResponse.status}`);
    }

    const frontData = await frontResponse.json();
    
    // Extract the generated front image
    const frontImageUrl = frontData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    const textDescription = frontData.choices?.[0]?.message?.content || 'Mockup generated successfully';

    if (!frontImageUrl) {
      return new Response(
        JSON.stringify({ 
          error: 'Failed to generate front mockup image. Please try again.',
          mockupDescription: textDescription
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate back mockup if back design is provided
    let backImageUrl = null;
    if (backDesignImage) {
      const backPrompt = `Apply this design to the back of a ${sanitizedProductType}. 
      Create a professional product mockup showing the back view with the design placed on it.
      The ${sanitizedProductType} should be displayed on a clean white background, centered, high quality studio lighting.
      Design placement follows ${sanitizedDesignSize} proportions.
      Style: Professional e-commerce product photo, minimalist, modern.`;

      const backResponse = await fetch(
        'https://ai.gateway.lovable.dev/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash-image-preview',
            messages: [
              {
                role: 'user',
                content: [
                  { type: 'text', text: backPrompt },
                  { type: 'image_url', image_url: { url: backDesignImage } }
                ]
              }
            ],
            modalities: ['image', 'text']
          }),
        }
      );

      if (backResponse.ok) {
        const backData = await backResponse.json();
        backImageUrl = backData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
      }
    }

    return new Response(
      JSON.stringify({ 
        mockupImage: frontImageUrl,
        backMockupImage: backImageUrl,
        mockupDescription: textDescription,
        success: true,
        productType: sanitizedProductType,
        designSize: sanitizedDesignSize
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
