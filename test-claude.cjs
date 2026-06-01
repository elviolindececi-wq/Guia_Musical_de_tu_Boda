async function testClaude() {
  try {
    console.log("Probando API local...");

    const response = await fetch("http://127.0.0.1:3001/api/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 100,
        messages: [
          {
            role: "user",
            content: 'Respondé solamente con este JSON: {"ok":true}'
          }
        ]
      })
    });

    const text = await response.text();

    console.log("STATUS:", response.status);
    console.log("RESPUESTA:");
    console.log(text);
  } catch (error) {
    console.error("ERROR COMPLETO:");
    console.error(error);
  }
}

testClaude();