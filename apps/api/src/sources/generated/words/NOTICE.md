# Origem da lista de palavras

`word-list.data.ts` é gerado por `build.ts` (`npm run words:build -w @cruzadinha/api`) a partir de:

- **FrequencyWords** (Hermit Dave), `content/2018/pt_br/pt_br_50k.txt`, commit `525f9b560de45753a5ea01069454e72e9aa541c6`. Conteúdo sob CC BY-SA 4.0 (o código do projeto é MIT).
- **LibreOffice dictionaries**, `pt_BR/` (projeto VERO), commit `5cf23af85b47be6e398add826da1a02175be4238`. Licença LGPLv3 e MPL. O dicionário só filtra: nenhuma palavra vem só dele.

A lista derivada fica sob **CC BY-SA 4.0** (compartilha pela mesma licença). As cruzadas geradas não redistribuem a lista.
