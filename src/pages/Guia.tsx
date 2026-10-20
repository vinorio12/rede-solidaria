import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useUsuario } from '@/auth/AuthContext'
import { useBanco } from '@/data/useBanco'
import { cicloAtivo } from '@/domain/regras'
import { concluirQuiz, responderPerguntaDia } from '@/domain/servicos'
import { Mascote } from '@/components/Mascote'
import { Aviso, CabecalhoPagina, Campo } from '@/components/ui'
import { avisar, confete } from '@/components/Feedback'
import { data, moeda } from '@/lib/datas'
import type { VarianteMascote } from '@/assets/mascote'

interface Pergunta {
  p: string
  opcoes: string[]
  certa: number
  explicacao: string
}

function perguntas(pctFia: number, pctIdoso: number, pctGlobal: number): Pergunta[] {
  return [
    { p: 'Destinar parte do IR aos fundos aumenta o imposto que eu pago?', opcoes: ['Sim', 'Não, não há custo adicional'], certa: 1, explicacao: 'Você só escolhe para onde vai parte do imposto que já é devido.' },
    { p: 'Quem pode destinar na declaração?', opcoes: ['Quem declara no modelo completo', 'Quem declara no modelo simplificado', 'Qualquer pessoa, sem declarar'], certa: 0, explicacao: 'A destinação na declaração é para quem usa o modelo completo (deduções legais).' },
    { p: `Na declaração, quanto do imposto devido posso destinar ao Fundo da Criança e do Adolescente?`, opcoes: [`Até ${pctFia}%`, 'Até 10%', 'Até 1%'], certa: 0, explicacao: `Até ${pctFia}% para o FIA e até ${pctIdoso}% para o Fundo do Idoso, na ficha Doações diretamente na declaração.` },
    { p: 'Até quando posso fazer a doação direta aos fundos durante o ano?', opcoes: ['Até 31 de dezembro', 'Até o Carnaval', 'Até 30 de junho'], certa: 0, explicacao: 'A doação direta vale para o ano-calendário e é informada na declaração do ano seguinte.' },
    { p: 'Qual o limite global da doação direta durante o ano?', opcoes: [`${pctGlobal}% do imposto devido`, '50% do imposto devido', 'Não há limite'], certa: 0, explicacao: `Respeite o limite global de ${pctGlobal}% do imposto devido somando as deduções de incentivo.` },
    { p: 'Quem tem imposto a restituir pode destinar?', opcoes: ['Não', 'Sim'], certa: 1, explicacao: 'Sim. A destinação é calculada sobre o imposto devido, não sobre o saldo a pagar.' },
  ]
}

const GLOSSARIO: [string, string][] = [
  ['FIA', 'Fundo da Infância e Adolescência: fundo municipal, estadual ou nacional dos direitos da criança e do adolescente.'],
  ['CMDCA', 'Conselho Municipal dos Direitos da Criança e do Adolescente, gestor do FIA no município.'],
  ['CMDI', 'Conselho Municipal dos Direitos da Pessoa Idosa, gestor do Fundo do Idoso no município.'],
  ['Chancela', 'Aprovação de um projeto pelo conselho, que autoriza a captação com indicação da entidade.'],
  ['DARF', 'Documento de Arrecadação de Receitas Federais, gerado pelo programa da declaração para pagar a doação.'],
  ['Imposto devido', 'Valor total do imposto calculado na declaração, antes de descontar o que já foi retido na fonte.'],
]

const FAQ: [string, string][] = [
  ['Preciso guardar o comprovante?', 'Sim. Guarde o DARF pago ou o recibo emitido pelo fundo por pelo menos 5 anos e envie uma cópia pelo app.'],
  ['Posso destinar em nome do meu cônjuge ou filhos?', 'Cada declarante destina sobre o próprio imposto. No app, você reporta em nome dos familiares cadastrados.'],
  ['Posso escolher a entidade?', 'Na doação direta, conforme o fundo, você pode indicar um projeto chancelado. Use a carta de destinação do app.'],
  ['O valor que eu doar aparece no ranking?', 'Nunca. O ranking usa só XP, e o XP é o mesmo para qualquer valor.'],
]

export function Guia() {
  const u = useUsuario()
  const b = useBanco()
  const loc = useLocation()
  const g = b.configuracoes.guia
  const ciclo = cicloAtivo(b)
  const qs = perguntas(g.pctFia, g.pctIdoso, g.pctGlobalDoacaoDireta)

  useEffect(() => {
    if (loc.hash) document.querySelector(loc.hash)?.scrollIntoView({ behavior: 'smooth' })
  }, [loc.hash])

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <CabecalhoPagina titulo="Guia prático do IR" subtitulo="Passo a passo para destinar parte do seu Imposto de Renda." />
      {!g.revisadoFiscal && <Aviso tipo="alerta">Conteúdo em revisão pela área fiscal e jurídica. Percentuais e prazos são configuráveis e revistos a cada ano.</Aviso>}

      <Passo n={1} titulo="O que é e por que destinar" mascote="acenando">
        Uma parte do imposto que você já paga pode ir para os fundos da criança, do adolescente e da pessoa idosa. <strong>Não há custo adicional</strong>: você só escolhe que o recurso fique no seu município.
      </Passo>
      <Passo n={2} titulo="Quem pode" mascote="pensando">
        Pessoa física que faz a declaração no <strong>modelo completo</strong>. Quem tem imposto a restituir também pode destinar.
      </Passo>
      <Passo n={3} titulo="Na declaração" mascote="apontando">
        Até <strong>{g.pctFia}%</strong> do imposto devido para o Fundo da Criança e do Adolescente e até <strong>{g.pctIdoso}%</strong> para o Fundo do Idoso, na ficha “Doações diretamente na declaração”. O programa gera o DARF, que deve ser pago até o prazo final da entrega ({data(ciclo.prazoDeclaracao)}).
      </Passo>
      <Passo n={4} titulo="Durante o ano (até 31/12)" mascote="comemorando">
        Doação direta aos fundos até <strong>{data(ciclo.prazoDoacaoDireta)}</strong>, observando o limite global de <strong>{g.pctGlobalDoacaoDireta}%</strong> do imposto devido. Conforme o fundo, dá para vincular a doação a uma entidade ou projeto chancelado. O valor é informado na declaração do ano seguinte.
      </Passo>

      <Simulador pctFia={g.pctFia} pctIdoso={g.pctIdoso} pctGlobal={g.pctGlobalDoacaoDireta} />
      <PerguntaDoDia uid={u.id} perguntas={qs} />
      <Quiz uid={u.id} perguntas={qs} xp={b.configuracoes.tabelaXp.quiz} />

      <section className="cartao" aria-labelledby="faq">
        <h2 id="faq" className="mb-2 font-titulo text-lg font-bold text-weg-900">
          Perguntas frequentes
        </h2>
        {FAQ.map(([p, r]) => (
          <details key={p} className="border-b border-borda py-2 last:border-0">
            <summary className="flex min-h-11 cursor-pointer items-center font-semibold">{p}</summary>
            <p className="pb-2 text-sm text-suave">{r}</p>
          </details>
        ))}
      </section>
      <section className="cartao" aria-labelledby="glossario">
        <h2 id="glossario" className="mb-2 font-titulo text-lg font-bold text-weg-900">
          Glossário
        </h2>
        <dl className="space-y-2 text-sm">
          {GLOSSARIO.map(([termo, def]) => (
            <div key={termo}>
              <dt className="font-bold text-rs-azul">{termo}</dt>
              <dd className="text-suave">{def}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  )
}

function Passo({ n, titulo, mascote, children }: { n: number; titulo: string; mascote: VarianteMascote; children: React.ReactNode }) {
  return (
    <section className="cartao flex gap-4">
      <div className="flex flex-col items-center">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-rs-azul font-titulo font-bold text-white">{n}</span>
        <Mascote variante={mascote} tamanho={64} className="mt-2 hidden sm:inline-block" decorativo />
      </div>
      <div>
        <h2 className="font-titulo text-lg font-bold text-weg-900">{titulo}</h2>
        <p className="mt-1">{children}</p>
      </div>
    </section>
  )
}

/** Simulador: o valor informado não é armazenado em lugar nenhum. */
function Simulador({ pctFia, pctIdoso, pctGlobal }: { pctFia: number; pctIdoso: number; pctGlobal: number }) {
  const [devido, setDevido] = useState(0)
  return (
    <section className="cartao space-y-3" aria-labelledby="simulador">
      <h2 id="simulador" className="font-titulo text-lg font-bold text-weg-900">
        Simulador
      </h2>
      <Campo rotulo="Imposto devido estimado (R$)" ajuda="Esse valor não é salvo.">
        <input className="campo" type="number" inputMode="decimal" min={0} value={devido || ''} onChange={(e) => setDevido(Number(e.target.value))} autoComplete="off" />
      </Campo>
      {devido > 0 && (
        <div className="grid gap-2 sm:grid-cols-3">
          <Resultado r={`Na declaração, FIA (${pctFia}%)`} v={moeda((devido * pctFia) / 100)} />
          <Resultado r={`Na declaração, Idoso (${pctIdoso}%)`} v={moeda((devido * pctIdoso) / 100)} />
          <Resultado r={`Doação direta até 31/12 (${pctGlobal}%)`} v={moeda((devido * pctGlobal) / 100)} />
        </div>
      )}
      <p className="text-xs text-suave">Estimativa educativa. O limite global considera também outras deduções de incentivo que você já utilize.</p>
    </section>
  )
}

function Resultado({ r, v }: { r: string; v: string }) {
  return (
    <div className="rounded-xl bg-rs-ciano-claro p-3">
      <p className="text-xs text-weg-900/80">{r}</p>
      <p className="font-titulo text-xl font-bold text-weg-900">{v}</p>
    </div>
  )
}

function PerguntaDoDia({ uid, perguntas }: { uid: string; perguntas: Pergunta[] }) {
  const dia = Math.floor(Date.now() / 86400000)
  const q = perguntas[dia % perguntas.length]
  const [resp, setResp] = useState<number | null>(null)
  return (
    <section id="pergunta" className="cartao scroll-mt-24 space-y-3" aria-labelledby="pergunta-titulo">
      <h2 id="pergunta-titulo" className="font-titulo text-lg font-bold text-weg-900">
        Pergunta do dia
      </h2>
      <p className="font-semibold">{q.p}</p>
      <div className="grid gap-2">
        {q.opcoes.map((o, i) => (
          <button
            key={o}
            disabled={resp !== null}
            onClick={() => {
              setResp(i)
              const feitas = responderPerguntaDia(uid)
              if (feitas.length) {
                confete()
                avisar(`Missão concluída: +${feitas[0].xp} XP`)
              }
            }}
            className={`min-h-11 rounded-xl border px-3 text-left transition ${resp === null ? 'border-borda hover:border-rs-azul' : i === q.certa ? 'border-sucesso bg-sucesso-claro' : resp === i ? 'border-alerta bg-alerta-claro' : 'border-borda opacity-60'}`}
          >
            {o}
          </button>
        ))}
      </div>
      {resp !== null && <Aviso tipo={resp === q.certa ? 'sucesso' : 'info'}>{q.explicacao}</Aviso>}
    </section>
  )
}

function Quiz({ uid, perguntas, xp }: { uid: string; perguntas: Pergunta[]; xp: number }) {
  const [respostas, setRespostas] = useState<(number | null)[]>(() => perguntas.map(() => null))
  const [resultado, setResultado] = useState<{ acertos: number; aprovado: boolean } | null>(null)
  const completo = respostas.every((r) => r !== null)

  const finalizar = () => {
    const acertos = respostas.filter((r, i) => r === perguntas[i].certa).length
    const r = concluirQuiz(uid, acertos, perguntas.length)
    setResultado({ acertos, aprovado: r.aprovado })
    if (r.aprovado) confete()
    if (r.ganhouXp) avisar(`Quiz concluído: +${xp} XP`)
  }

  return (
    <section id="quiz" className="cartao scroll-mt-24 space-y-4" aria-labelledby="quiz-titulo">
      <div className="flex items-center justify-between">
        <h2 id="quiz-titulo" className="font-titulo text-lg font-bold text-weg-900">
          Quiz do guia
        </h2>
        <span className="chip bg-rs-ciano-claro text-weg-900">+{xp} XP uma vez por ciclo</span>
      </div>
      {perguntas.map((q, i) => (
        <fieldset key={q.p} className="space-y-1">
          <legend className="font-semibold">
            {i + 1}. {q.p}
          </legend>
          {q.opcoes.map((o, j) => (
            <label key={o} className="flex min-h-11 items-center gap-2">
              <input
                type="radio"
                className="h-5 w-5 accent-rs-azul"
                name={`q${i}`}
                checked={respostas[i] === j}
                disabled={!!resultado}
                onChange={() => setRespostas(respostas.map((r, k) => (k === i ? j : r)))}
              />
              <span className={resultado ? (j === q.certa ? 'font-bold text-sucesso' : respostas[i] === j ? 'text-alerta' : '') : ''}>{o}</span>
            </label>
          ))}
        </fieldset>
      ))}
      {resultado ? (
        <div className="flex items-center gap-3">
          <Mascote variante={resultado.aprovado ? 'comemorando' : 'pensando'} tamanho={64} />
          <div>
            <p className="font-semibold">
              {resultado.acertos} de {perguntas.length} acertos. {resultado.aprovado ? 'Mandou bem!' : 'Revise o guia e tente de novo.'}
            </p>
            <button
              className="botao-fantasma px-0"
              onClick={() => {
                setResultado(null)
                setRespostas(perguntas.map(() => null))
              }}
            >
              Refazer
            </button>
          </div>
        </div>
      ) : (
        <button className="botao-primario w-full" disabled={!completo} onClick={finalizar}>
          Ver resultado
        </button>
      )}
    </section>
  )
}
