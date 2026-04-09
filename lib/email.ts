import { Resend } from 'resend'

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    throw new Error('RESEND_API_KEY não configurada')
  }
  return new Resend(apiKey)
}

interface SendReportEmailParams {
  to: string[]
  subject: string
  xlsxBuffer: Buffer
  filename: string
}

export async function sendReportEmail({
  to,
  subject,
  xlsxBuffer,
  filename,
}: SendReportEmailParams) {
  const resend = getResendClient()
  const { error } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL ?? 'Stock Beauty Clinic <relatorios@resend.dev>',
    to,
    subject,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #7c3aed;">📊 Relatório Mensal de Estoque</h2>
        <p>Olá,</p>
        <p>Segue em anexo o relatório mensal do controle de estoque da clínica.</p>
        <p>O arquivo contém informações sobre:</p>
        <ul>
          <li>Resumo de métricas</li>
          <li>Distribuição por tipo e status</li>
          <li>Top consumo e descartes</li>
          <li>Movimentação por colaborador</li>
          <li>Insumos com estoque zerado</li>
          <li>Alertas de vencimento e estoque baixo</li>
          <li>Atividade recente</li>
        </ul>
        <p style="color: #6b7280; font-size: 14px;">
          Este email é enviado automaticamente pelo sistema Stock Beauty Clinic.
        </p>
      </div>
    `,
    attachments: [
      {
        filename,
        content: xlsxBuffer,
        contentType:
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      },
    ],
  })

  if (error) {
    throw new Error(`Falha ao enviar email: ${error.message}`)
  }
}
