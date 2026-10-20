import { useState } from 'react'

export const TEXTO_TERMO = [
  'Finalidade: registrar e validar suas destinações do Imposto de Renda aos fundos da criança, do adolescente e da pessoa idosa, calcular a meta institucional e reconhecer a sua participação na Rede Solidária.',
  'Dados tratados: nome, e-mail, unidade, município, familiares que você cadastrar, valores e comprovantes das destinações. CPF e endereço são usados apenas na carta de destinação.',
  'Quem vê: valores e comprovantes ficam visíveis só para você, para seu padrinho (no caso de convidados) e para a Seção Desenvolvimento Social. Valores nunca aparecem em ranking, feed ou cards compartilháveis.',
  'Seus direitos: você pode exportar seus dados e excluir sua conta a qualquer momento no Perfil.',
]

export function TermoLgpd({ aceite, aoMudar }: { aceite: boolean; aoMudar: (v: boolean) => void }) {
  const [aberto, setAberto] = useState(false)
  return (
    <div className="rounded-xl border border-borda p-3 text-sm">
      <button type="button" className="font-semibold text-rs-azul underline" onClick={() => setAberto(!aberto)} aria-expanded={aberto}>
        {aberto ? 'Ocultar' : 'Ler'} o termo de consentimento (LGPD)
      </button>
      {aberto && (
        <ul className="mt-2 list-disc space-y-1 pl-5 text-suave">
          {TEXTO_TERMO.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      )}
      <label className="mt-2 flex min-h-11 items-start gap-2">
        <input type="checkbox" className="mt-1 h-5 w-5 accent-rs-azul" checked={aceite} onChange={(e) => aoMudar(e.target.checked)} />
        <span>Li e concordo com o tratamento dos meus dados para as finalidades descritas.</span>
      </label>
    </div>
  )
}
