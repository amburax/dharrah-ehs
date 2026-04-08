/**
 * Dharrah EHS - Elite Contact Worker (V2)
 * Features: Branded HTML Email Template, WhatsApp Quick-Links, Resent API Integration
 * API Key: re_2RYomawc_726hfG6nPftSfH9nfF6yEixj
 */

export default {
  async fetch(request, env) {
    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    try {
      const data = await request.json();
      const { name, company, email, phone, subject, message } = data;

      // Clean phone for WhatsApp link
      const cleanPhone = phone.replace(/\D/g, "");
      const whatsappUrl = `https://wa.me/${cleanPhone}`;

      // --- ELITE HTML TEMPLATE ---
      const htmlBody = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f7f9; }
            .container { max-width: 600px; margin: 20px auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05); }
            .header { background-color: #1A2D5A; color: #ffffff; padding: 30px; text-align: center; border-bottom: 5px solid #c8201a; }
            .header h1 { margin: 0; font-size: 20px; text-transform: uppercase; letter-spacing: 2px; }
            .content { padding: 30px; }
            .lead-info { width: 100%; border-collapse: collapse; margin-bottom: 25px; }
            .lead-info td { padding: 12px; border-bottom: 1px solid #edf2f7; font-size: 14px; }
            .label { font-weight: 700; color: #718096; width: 30%; text-transform: uppercase; font-size: 11px; }
            .value { color: #1A2D5A; font-weight: 500; }
            .message-box { background-color: #f8fafc; border-left: 4px solid #c8201a; padding: 20px; margin-top: 10px; font-style: italic; color: #4a5568; }
            .actions { margin-top: 30px; text-align: center; }
            .btn { display: inline-block; padding: 12px 25px; margin: 10px 5px; border-radius: 6px; text-decoration: none; font-weight: 700; font-size: 13px; transition: 0.3s; }
            .btn-navy { background-color: #1A2D5A; color: #ffffff !important; }
            .btn-green { background-color: #25D366; color: #ffffff !important; }
            .footer { background-color: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #adb5bd; border-top: 1px solid #edf2f7; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>New Inquiry Received</h1>
            </div>
            <div class="content">
              <table class="lead-info">
                <tr>
                  <td class="label">Full Name</td>
                  <td class="value">${name}</td>
                </tr>
                <tr>
                  <td class="label">Company</td>
                  <td class="value">${company || "Not Specified"}</td>
                </tr>
                <tr>
                  <td class="label">Email</td>
                  <td class="value"><a href="mailto:${email}" style="color: #c8201a;">${email}</a></td>
                </tr>
                <tr>
                  <td class="label">Phone</td>
                  <td class="value">${phone}</td>
                </tr>
                <tr>
                  <td class="label">Subject</td>
                  <td class="value bold">${subject}</td>
                </tr>
              </table>
              
              <div style="font-weight: 700; font-size: 11px; color: #718096; text-transform: uppercase; margin-bottom: 10px;">Message Brief</div>
              <div class="message-box">
                "${message}"
              </div>

              <div class="actions">
                <a href="mailto:${email}" class="btn btn-navy">Reply via Email</a>
                <a href="${whatsappUrl}" class="btn btn-green">Message on WhatsApp</a>
              </div>
            </div>
            <div class="footer">
              This lead was generated from dharrahehs.com<br>
              © ${new Date().getFullYear()} Dharrah EHS Consultancy
            </div>
          </div>
        </body>
        </html>
      `;

      // --- SEND VIA RESEND ---
      const resendResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer re_2RYomawc_726hfG6nPftSfH9nfF6yEixj`,
        },
        body: JSON.stringify({
          from: "Dharrah EHS <onboarding@resend.dev>", // Or your verified domain
          to: ["info@dharrahehs.com"],
          subject: `Elite Lead: ${name}${company ? " | " + company : ""}`,
          html: htmlBody,
        }),
      });

      if (resendResponse.ok) {
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        });
      } else {
        const errorText = await resendResponse.text();
        return new Response(errorText, { status: 500 });
      }

    } catch (err) {
      return new Response(err.message, { status: 500 });
    }
  },
};
