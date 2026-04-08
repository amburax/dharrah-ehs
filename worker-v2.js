export default {
  async fetch(request, env) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      const data = await request.json();
      
      const emailHTML = `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7f6; padding: 30px 15px; margin: 0;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
            <div style="background-color: #1e293b; color: #ffffff; padding: 25px 20px; text-align: center;">
              <h2 style="margin: 0; font-size: 24px; font-weight: 600;">New Lead Received</h2>
            </div>
            <div style="padding: 30px; color: #334155;">
              <p><strong>Name:</strong> ${data.name || 'Not provided'}</p>
              <p><strong>Company:</strong> ${data.company || 'Not provided'}</p>
              <p><strong>Email:</strong> ${data.email || 'Not provided'}</p>
              <p><strong>Message:</strong></p>
              <div style="background-color: #f8fafc; padding: 15px; border-radius: 6px; border: 1px solid #e2e8f0; white-space: pre-wrap;">${data.message || 'No message provided.'}</div>
            </div>
          </div>
        </div>
      `;

      // Send to Resend
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer re_2RYomawc_726hfG6nPftSfH9nfF6yEixj`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Website Form <contact@dharrahehs.com>", 
          to: ["info@dharrahehs.com"],
          subject: `New Lead: ${data.name || 'Website Visitor'}`,
          html: emailHTML,
        }),
      });

      // Behave exactly like your old code: Always return success to the frontend
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });

    } catch (err) {
      // Only throw 500 if the frontend data was completely broken
      return new Response(JSON.stringify({ success: false }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
  },
};
