# Cifra Pocket Club

Aplicação web responsiva para organizar cifras e letras de músicas em agrupamentos chamados **Pockets**. Os dados são armazenados localmente no navegador usando IndexedDB.

## Funcionalidades

- Criar e listar pockets.
- Adicionar músicas a um pocket informando título, tom e cifra/letra em texto.
- Converter as cifras importadas para seções com acordes e posições de caracteres.
- Visualizar a letra com os acordes posicionados acima da frase correspondente.
- Navegar diretamente para pockets e músicas por meio de URLs com hash.

## Tecnologias

- HTML, CSS e JavaScript sem framework ou etapa de compilação.
- IndexedDB para armazenamento persistente no navegador.
- GitHub Actions para validar e publicar a aplicação no GitHub Pages.

## Executar localmente

É necessário servir os arquivos por HTTP para que o navegador possa usar a aplicação de maneira consistente. Com Python instalado, execute na raiz do projeto:

```bash
python -m http.server 8000
```

Abra <http://localhost:8000> no navegador. Também é possível usar a extensão Live Server do VS Code.

## Importar uma cifra

Na tela de um pocket, selecione **Adicionar música**, informe o título e o tom e cole a letra/cifra no campo de texto.

Formatos de acorde reconhecidos:

- Marcado com asteriscos: `**A**`
- Sem marcação em uma linha de acordes: `A`, `'A'`, `"A"` ou `""A""`
- Cifras com extensões, por exemplo: `A7M`, `F#/A#`, `D9`

Quando os acordes aparecem em uma linha separada, eles são associados à frase de letra seguinte. Trechos `[Intro]` com linhas compostas somente por acordes são ignorados. Título inicial e linha `Tom:` também são removidos da letra importada. Cabeçalhos entre colchetes, como `[Ponte 1]`, são mantidos como títulos de seção.

## Armazenamento

O banco IndexedDB chama-se `cifraPocketClub` e atualmente está na versão 2. Ele contém:

### `tPocket`

| Campo | Tipo | Descrição |
| --- | --- | --- |
| `id` | string | UUID do pocket (chave primária) |
| `nome` | string | Nome do pocket |

### `tPocketMusicas`

| Campo | Tipo | Descrição |
| --- | --- | --- |
| `id` | string | UUID da música (chave primária) |
| `nome` | string | Título da música |
| `tom` | string | Tom da música |
| `cifra` | string | JSON serializado das seções da música |
| `sections` | string | JSON serializado com a letra, acordes e suas posições |
| `pocketId` | string | ID do pocket ao qual a música pertence |

O formato armazenado em `sections` é:

```json
{
  "sections": [
    {
      "text": "Frase da música",
      "chords": [
        {
          "chord": "A",
          "chartIndex": 0
        }
      ]
    }
  ]
}
```

Os dados pertencem ao perfil e à origem usados no navegador. Eles não são sincronizados entre dispositivos nem enviados ao GitHub Pages.

## Publicar no GitHub Pages

O workflow [`.github/workflows/pages.yml`](.github/workflows/pages.yml) valida os arquivos, executa a verificação de sintaxe JavaScript e publica o site quando há um push para `main` ou `master`. Também pode ser iniciado manualmente pela aba **Actions** do GitHub.

1. Crie um repositório no GitHub e configure-o como remoto:

   ```bash
   git remote add origin https://github.com/SEU_USUARIO/SEU_REPOSITORIO.git
   ```

2. Envie a branch principal:

   ```bash
   git push -u origin main
   ```

3. Nas configurações do repositório, acesse **Settings → Pages** e defina **Source** como **GitHub Actions**.

Após a execução bem-sucedida do workflow, o endereço publicado será exibido no ambiente `github-pages` e na página da execução em **Actions**.

## Estrutura

```text
.
├── .github/
│   └── workflows/
│       └── pages.yml
├── .gitignore
├── .nojekyll
├── app.js
├── index.html
├── styles.css
└── README.md
```
