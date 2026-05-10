async function pedirTreino() {
    const inputElement = document.getElementById('input-treino');
    const btnElement = document.getElementById('btn-gerar');
    const areaResultado = document.getElementById('area-resultado');
    const textoResposta = document.getElementById('texto-resposta');

    const mensagem = inputElement.value;

    if (!mensagem) {
        alert("Por favor, digite o que você quer treinar!");
        return;
    }

    // Muda o botão pra mostrar que está carregando
    btnElement.innerText = "Pensando no treino...";
    btnElement.disabled = true;
    btnElement.classList.add('opacity-50');

    try {
        // Envia a requisição para a sua função Serverless na Vercel
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ mensagemDoUsuario: mensagem })
        });

        const data = await response.json();

        if (response.ok) {
            // Mostra o resultado na tela
            textoResposta.innerText = data.treino;
            areaResultado.classList.remove('hidden');
        } else {
            alert("Erro: " + data.error);
        }

    } catch (error) {
        alert("Falha na conexão.");
    } finally {
        // Restaura o botão
        btnElement.innerText = "Gerar Treino";
        btnElement.disabled = false;
        btnElement.classList.remove('opacity-50');
    }
}