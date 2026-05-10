module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Apenas método POST é permitido' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    const { mensagemDoUsuario } = req.body;

    try {
        const googleResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
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

        // Pega a resposta do Google
        const data = await googleResponse.json();

        // 🕵️‍♂️ O SUPER ESPIÃO: Imprime ABSOLUTAMENTE TUDO que o Google respondeu na log da Vercel
        console.log("RESPOSTA COMPLETA DO GOOGLE:", JSON.stringify(data, null, 2));

        if (!googleResponse.ok) {
            return res.status(500).json({ error: 'O Google recusou a requisição. Olhe os logs.' });
        }

        // REDE DE SEGURANÇA: Checa se a lista 'candidates' realmente existe antes de tentar ler
        if (!data.candidates || data.candidates.length === 0) {
            return res.status(500).json({ error: 'O Google respondeu, mas não enviou o treino. Olhe a log para ver o motivo.' });
        }

        // Agora sim, é seguro ler o texto
        const textoDaIA = data.candidates[0].content.parts[0].text;

        res.status(200).json({ treino: textoDaIA });

    } catch (error) {
        console.error("ERRO FATAL NO SERVIDOR:", error);
        res.status(500).json({ error: 'Erro interno no servidor' });
    }
}