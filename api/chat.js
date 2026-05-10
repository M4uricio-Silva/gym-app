export default async function handler(req, res) {
  // Apenas aceita requisições POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Apenas método POST é permitido' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  const { mensagemDoUsuario } = req.body;

  try {
    // Fazendo a chamada direto para a API REST do Gemini
    const googleResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          role: "user",
          parts: [{ 
            // Aqui você dá a "personalidade" pra IA. Pode mudar depois!
            text: `Você é um treinador especialista em academia. O usuário pediu: "${mensagemDoUsuario}". 
                   Crie uma rotina de treino detalhada, focada na evolução do usuário. Retorne o texto bem formatado.` 
          }]
        }]
      })
    });

    const data = await googleResponse.json();
    const textoDaIA = data.candidates[0].content.parts[0].text;

    // Devolve a resposta pronta para o seu site
    res.status(200).json({ treino: textoDaIA });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao conectar com a IA' });
  }
}