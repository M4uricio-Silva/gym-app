module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Apenas método POST' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    const { pedido } = req.body;

    try {
        const googleResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    role: "user",
                    parts: [{
                        text: `Você é a Kaiser AI, a inteligência central de um aplicativo de musculação hardcore.
            
            O usuário está pedindo um treino ou dica de musculação com esta instrução: "${pedido}".
            
            SUAS REGRAS:
            1. O foco é hipertrofia e progressão de carga (ferro, anilhas, máquinas). Zero calistenia.
            2. Seja direto, prático e sem enrolação. Use um tom de treinador profissional e focado.
            3. Se recomendar dieta ou pós-treino, inclua suplementos eficazes e de rápida absorção como whey, creatina e carboidratos densos (como pasta de amendoim).
            4. Formate a resposta de maneira limpa (Exercício | Séries x Repetições).`
                    }]
                }]
            })
        });

        const data = await googleResponse.json();

        if (!googleResponse.ok || !data.candidates) {
            return res.status(500).json({ error: 'Falha nos servidores do Google.' });
        }

        const resposta = data.candidates[0].content.parts[0].text;
        res.status(200).json({ resposta: resposta });

    } catch (error) {
        res.status(500).json({ error: 'Erro interno na Vercel.' });
    }
}