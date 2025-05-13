const { openai } = require('../config/assistant');
const pptConfig = {
  systemMessage: "You are a helpful assistant that creates PowerPoint slide content.",
  temperature: 0.7,
  model: "gpt-4o-mini"
};
const PPTX = require('pptxgenjs');

const generatePresentation = async (req, res) => {
  try {
    const { prompt, template, animationStyle } = req.body;
    
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length < 10) {
      return res.status(400).json({ 
        error: 'Prompt must be a string with at least 10 characters' 
      });
    }
    let completion;
    try {
      completion = await openai.chat.completions.create({
        model: pptConfig.model, 
        messages: [
          // {
          //   role: "system",
          //   content: pptConfig.systemMessage
          // },
          { 
            role: "user", 
            content: `Create PowerPoint slides about: ${prompt}. Use template: ${template}.
            Respond ONLY in the following JSON format:
              {
                "slides": [
                  { "title": "Slide Title", "content": "Slide content goes here." },
                  ...
  ]
              }`
          }
        ],
        temperature: pptConfig.temperature
      });
    } catch (openaiError) {
      console.error('OpenAI API Error:', openaiError);
      return res.status(502).json({ 
        error: 'AI service unavailable',
        details: openaiError.message 
      });
    }

    let slidesData;
    try {
      const responseContent = completion.choices[0].message.content;
      slidesData = JSON.parse(responseContent).slides || JSON.parse(responseContent);
      
      if (!Array.isArray(slidesData)) {
        throw new Error('AI response format invalid');
      }
    } catch (parseError) {
      console.error('Response parsing error:', parseError);
      return res.status(500).json({ 
        error: 'Failed to process AI response',
        details: parseError.message 
      });
    }

    // Create PPT with template support
    const pptx = new PPTX();
    
    // Apply template settings if available
    if (template) {
      pptx.defineSlideMaster({
        title: 'MASTER_SLIDE',
        background: { color: 'FFFFFF' },
        objects: [
          { rect: { x: 0, y: 0, w: '100%', h: 0.5, fill: '2C3E50' } },
        ]
      });
    }

    // Generate slides
    slidesData.forEach((slide, index) => {
      const pptSlide = pptx.addSlide(template ? 'MASTER_SLIDE' : undefined);
      
      // Add title with template-specific styling
      pptSlide.addText(slide.title, { 
        x: 1, 
        y: 0.5, 
        w: 8, 
        h: 1,
        fontSize: 48,
        bold: true,
        color: template ? 'FFFFFF' : '000000'
      });
      
      // Add content
      pptSlide.addText(slide.content, { 
        x: 1, 
        y: 1.5, 
        w: 8, 
        h: 4,
        fontSize: 18
      });

      // Add image if available
      if (slide.image) {
        pptSlide.addImage({
          path: slide.image,
          x: 1,
          y: 3.5,
          w: 6,
          h: 3
        });
      }
      
      // Add animations if selected
      // if (animationStyle) {
      //   pptSlide.addAnimation({
      //     effect: animationStyle,
      //     delay: 0
      //   });
      // }
    });

    // Return both base64 data and structured slide data
    const pptBuffer = await pptx.write({ outputType: 'base64' });
    
    res.json({ 
      pptData: pptBuffer,
      slides: slidesData,
      message: 'Presentation generated successfully'
    });
    
  } catch (error) {
    console.error('Generation error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
};

module.exports = { generatePresentation };
