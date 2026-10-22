# Quickstart: validar os templates

## Antes do merge (local)

```sh
npm run format:check    # Prettier cobre .github/ISSUE_TEMPLATE/*.yml
for f in .github/ISSUE_TEMPLATE/*.yml; do
  python3 -c "import sys,yaml; yaml.safe_load(open(sys.argv[1]))" "$f" && echo "ok $f"
done
```

Conferir também, nos quatro formulários: `name` único, `description` presente, `title` com o prefixo do contrato, só as etiquetas `bug`, `enhancement` e `documentation`, e que os campos obrigatórios batem com [contracts/issue-forms.md](contracts/issue-forms.md).

## Depois do merge em `main` (manual, SC-005)

1. Abrir `https://github.com/BrunoYTanaka/cruzadinha/issues/new/choose`: aparecem Bug, Manutenção / chore, Documentação e Feature / melhoria, cada um com a descrição, e a opção de issue em branco.
2. Em cada formulário, tentar enviar sem os campos obrigatórios: o envio é recusado; preencher só os obrigatórios: a issue é criada.
3. Conferir título com prefixo e etiqueta (`bug`, `enhancement`, `documentation`; chore sem etiqueta).
4. No bug, anexar uma imagem no campo de evidências: aceita.
5. Fechar as issues de teste.
