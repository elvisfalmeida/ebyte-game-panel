# Fusos horários

[English](TIMEZONE.md) · [Português (Brasil)](TIMEZONE.pt-BR.md)

Os horários exibidos pelo console do servidor podem usar um fuso IANA definido
durante o build do frontend:

```env
VITE_LOG_TIME_ZONE=America/Sao_Paulo
```

Quando a variável está vazia, o painel usa o fuso do navegador. Valores
inválidos também retornam com segurança ao fuso do navegador.

Os horários gerados pelo próprio jogo dependem do contêiner. Imagens com a base
IANA, como a imagem do Palworld, aceitam a variável padrão `TZ` na configuração
do servidor:

```env
TZ=America/Sao_Paulo
```

Alterar uma variável de ambiente recria o contêiner e reinicia um servidor que
esteja em execução. Os dados persistentes permanecem no volume montado.
