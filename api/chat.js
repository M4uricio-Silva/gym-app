module.exports = async function handler(req, res) {
    // Apenas aceita requisições POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Apenas método POST é permitido' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    const { mensagemDoUsuario } = req.body;

    try {
        const googleResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    role: "user",
                    parts: [{
                        text: `Você é um treinador especialista em calistenia. O usuário pediu: "${mensagemDoUsuario}". 
                   Crie uma rotina de treino detalhada, focada na evolução do usuário. Retorne o texto bem formatado.`
                    }]
                }]
            })
        });

        const data = await googleResponse.json();

        // Nosso "espião": se o Google der erro (ex: chave errada), ele avisa no Log da Vercel
        if (!googleResponse.ok) {
            console.error("RESPOSTA DE ERRO DO GOOGLE:", data);
            return res.status(500).json({ error: 'O Google recusou a requisição. Olhe os logs.' });
        }

        const textoDaIA = data.candidates[0].content.parts[0].text;

        // Devolve a resposta pronta para o seu site
        res.status(200).json({ treino: textoDaIA });

    } catch (error) {
        // Se o código quebrar em qualquer outro lugar, ele avisa aqui
        console.error("ERRO FATAL NO SERVIDOR:", error);
        res.status(500).json({ error: 'Erro interno no servidor' });
    }
}