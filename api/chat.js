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
                        text: `Você é a "Kaiser AI", um treinador de hipertrofia de elite e PhD em Biomecânica e Fisiologia do Exercício. 
Sua base de conhecimento inclui a literatura acadêmica mais recente sobre hipertrofia, tensão mecânica, estresse metabólico e periodização de atletas de alto rendimento.

O usuário vai dar um comando curto, como: "${mensagemDoUsuario}".

SUA MISSÃO (Pense nisso antes de gerar a resposta):
1. Avalie a curva de fadiga do treino.
2. Inicie SEMPRE com um exercício multiarticular pesado (maior demanda do Sistema Nervoso Central).
3. Progrida para exercícios de hipertrofia hipertrófica pura (volume).
4. Termine com exercícios isoladores focados em estresse metabólico (seguros para falha total).
5. Otimize a seleção de máquinas/pesos livres para evitar sobreposição lesiva de articulações.

REGRAS ESTRITAS DE SAÍDA:
- NÃO faça introduções ou conclusões.
- NÃO use asteriscos (*) ou formatação markdown.
- NÃO deixe tudo junto, faça separado por linhas.
- Retorne o treino no formato exato abaixo, incluindo o motivo biomecânico curto:

1. [Nome do Exercício] | [Séries]x[Reps] | [Técnica/Motivo: Ex: Foco em alongamento sob carga máxima. Mantenha controle excêntrico de 3s para maximizar tensão mecânica.]
2. [Nome do Exercício] | [Séries]x[Reps] | [Técnica/Motivo...]`
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