import nodemailer from 'nodemailer'

function createTransport() {
  const user = process.env.GMAIL_USER
  const pass = process.env.GMAIL_APP_PASSWORD
  if (!user || !pass) {
    throw new Error('GMAIL_USER ou GMAIL_APP_PASSWORD não configurados')
  }
  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass },
  })
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
  const transporter = createTransport()
  const from = `Stock Beauty Clinic <${process.env.GMAIL_USER}>`

  await transporter.sendMail({
    from,
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
}
