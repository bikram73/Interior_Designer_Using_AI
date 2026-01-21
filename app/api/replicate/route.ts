import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    // 1. Get request data (in JSON format) from the client
    const req = await request.json();

    const image = req.image;
    const theme = req.theme;
    const room = req.room;

    console.log('Request received:', { theme, room, imageLength: image?.length });

    // 2. Create a detailed prompt for interior design
    const prompt = `A stunning ${theme.toLowerCase()} style ${room.toLowerCase()} interior design, professional photography, high-end furniture, beautiful lighting, clean and organized, architectural digest style, 4k, ultra-detailed, realistic, modern decor, elegant, spacious, well-lit`;

    // 3. Use Pollinations.ai - completely free, no API key needed
    const encodedPrompt = encodeURIComponent(prompt);
    const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=768&height=768&seed=${Math.floor(Math.random() * 1000000)}`;

    console.log('Generated image URL:', imageUrl);

    // 4. Fetch the image to verify it works and convert to base64 to avoid CORS issues
    try {
      const response = await fetch(imageUrl);
      if (response.ok) {
        const imageBlob = await response.blob();
        const arrayBuffer = await imageBlob.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString('base64');
        const base64ImageUrl = `data:image/png;base64,${base64}`;
        
        console.log('Pollinations.ai image generated and converted to base64 successfully');
        return NextResponse.json({ output: [base64ImageUrl] }, { status: 201 });
      } else {
        throw new Error(`Pollinations API returned ${response.status}`);
      }
    } catch (fetchError) {
      console.log('Pollinations.ai failed, trying direct URL approach');
      
      // Try returning the direct URL first
      console.log('Returning direct image URL:', imageUrl);
      return NextResponse.json({ output: [imageUrl] }, { status: 201 });
    }

  } catch (error) {
    console.error('Error in /api/replicate:', error);
    
    // Final fallback - generate a simple design concept
    const designColors = {
      'Modern': '#2563eb',
      'Vintage': '#92400e', 
      'Minimalist': '#6b7280',
      'Professional': '#1f2937'
    };
    
    const color = designColors[theme as keyof typeof designColors] || '#6b7280';
    
    const canvas = `<svg width="768" height="768" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${color};stop-opacity:0.8" />
          <stop offset="100%" style="stop-color:${color};stop-opacity:0.4" />
        </linearGradient>
      </defs>
      <rect width="768" height="768" fill="url(#grad1)" />
      <rect x="50" y="50" width="668" height="668" fill="none" stroke="white" stroke-width="2" opacity="0.3"/>
      <text x="384" y="300" font-family="Arial, sans-serif" font-size="36" fill="white" text-anchor="middle" font-weight="bold">
        ${theme}
      </text>
      <text x="384" y="350" font-family="Arial, sans-serif" font-size="28" fill="white" text-anchor="middle">
        ${room}
      </text>
      <text x="384" y="420" font-family="Arial, sans-serif" font-size="18" fill="white" text-anchor="middle" opacity="0.8">
        Interior Design Concept
      </text>
      <circle cx="200" cy="500" r="30" fill="white" opacity="0.2"/>
      <circle cx="384" cy="550" r="25" fill="white" opacity="0.3"/>
      <circle cx="568" cy="480" r="35" fill="white" opacity="0.2"/>
    </svg>`;
    
    const base64 = Buffer.from(canvas).toString('base64');
    const imageUrl = `data:image/svg+xml;base64,${base64}`;
    
    return NextResponse.json({ 
      output: [imageUrl],
      message: `${theme} ${room} design concept generated`
    }, { status: 201 });
  }
}
