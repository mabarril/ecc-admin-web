import { Component, DOCUMENT, Input } from '@angular/core';
import { CasaisService } from '../../services/casais.service'; // ajuste o caminho se necessário
import jsPDF from 'jspdf';
import { Utils } from '../../services/utils';

@Component({
  selector: 'app-ficha-pdf',
  templateUrl: './ficha-pdf.html',
  styleUrl: './ficha-pdf.scss'
})
export class FichaPdfComponent {
  casal: any;



  constructor(private casaisService: CasaisService) { }

  buscarCasalEExibirPDF(casalId: number) {
    if (!casalId) return;
    this.casaisService.getCasaisById(casalId).subscribe({
      next: (casal) => {
        this.casal = casal;
        this.gerarPDF();
      },
      error: () => {
        alert('Erro ao buscar casal');
      }
    });
  }

  formatarData(data: string): string {
    if (!data) return '';
    const partes = data.split('-');
    if (partes.length !== 3) return data; // Retorna a data original      
    return `${partes[2]}/${partes[1]}/${partes[0]}`; // Formato DD/MM/AAAA
  }

  gerarPDF() {
    if (!this.casal) return;
    const doc = new jsPDF();
    doc.rect(15, 15, 180, 15); // empty square
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(`ENCONTRO DE CASAIS COM CRISTO (ECC) - 01 a 03/AGO/25`, 105, 20, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    doc.text(`Ficha de Inscrição dos Encontristas/Padrinho`, 105, 27, { align: 'center' });

    doc.setFontSize(12);
    let bloco_esposo = 40;
    doc.setFont('helvetica', 'bold');
    doc.text(`Dados do Esposo`, 20, bloco_esposo);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    let dt_nascimento_esposo = Utils.formatarData(this.casal.pessoas?.[0]?.data_nascimento);
    doc.text(`Nome do Esposo: ${this.casal.pessoas?.[0]?.nome_completo || ''}`, 20, bloco_esposo + 5);
    doc.text(`Como gostaria de ser chamado? ${this.casal.pessoas?.[0]?.nome_social || ''}`, 20, bloco_esposo + 10);
    doc.text(`Dt. Nasc.: ${dt_nascimento_esposo || ''}`, 120, bloco_esposo + 10);
    doc.text(`Profissão ${this.casal.pessoas?.[0]?.profissao || ''}`, 20, bloco_esposo + 15);
    doc.text(`e-mail: ${this.casal.pessoas?.[0]?.email || ''}`, 120, bloco_esposo + 15);
    doc.text(`Celular: ${this.casal.pessoas?.[0]?.celular || ''}`, 20, bloco_esposo + 20);
    doc.text(`Religião: ${this.casal.pessoas?.[0]?.religiao || ''}`, 120, bloco_esposo + 20);
    doc.text(`RG: ${this.casal.pessoas?.[0]?.rg || ''}`, 20, bloco_esposo + 25);
    doc.text(`Emissor: ${this.casal.pessoas?.[0]?.rg_emissor || ''}`, 70, bloco_esposo + 25);
    doc.text(`CPF: ${this.casal.pessoas?.[0]?.cpf || ''}`, 120, bloco_esposo + 25);


    let bloco_esposa = 80;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`Dados da Esposa`, 20, bloco_esposa);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    let dt_nascimento_esposa = Utils.formatarData(this.casal.pessoas?.[1]?.data_nascimento);
    doc.text(`Nome da Esposa: ${this.casal.pessoas?.[1]?.nome_completo || ''}`, 20, bloco_esposa + 5);
    doc.text(`Como gostaria de ser chamado? ${this.casal.pessoas?.[1]?.nome_social || ''}`, 20, bloco_esposa + 10);
    doc.text(`Dt. Nasc.: ${dt_nascimento_esposa || ''}`, 120, bloco_esposa + 10);
    doc.text(`Profissão ${this.casal.pessoas?.[1]?.profissao || ''}`, 20, bloco_esposa + 15);
    doc.text(`e-mail: ${this.casal.pessoas?.[1]?.email || ''}`, 120, bloco_esposa + 15);
    doc.text(`Celular: ${this.casal.pessoas?.[1]?.celular || ''}`, 20, bloco_esposa + 20);
    doc.text(`Religião: ${this.casal.pessoas?.[1]?.religiao || ''}`, 120, bloco_esposa + 20);
    doc.text(`RG: ${this.casal.pessoas?.[1]?.rg || ''}`, 20, bloco_esposa + 25);
    doc.text(`Emissor: ${this.casal.pessoas?.[1]?.rg_emissor || ''}`, 70, bloco_esposa + 25);
    doc.text(`CPF: ${this.casal.pessoas?.[1]?.cpf || ''}`, 120, bloco_esposa + 25);

    let bloco_contatos = 120;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`Contatos em caso de emergência`, 20, bloco_contatos);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Nome: ${this.casal.contato_emergencia_nome1 || ''}`, 20, bloco_contatos + 5);
    doc.text(`Telefone: ${this.casal.contato_emergencia_telefone1 || ''}`, 20, bloco_contatos + 10);
    doc.text(`Nome: ${this.casal.contato_emergencia_nome2 || ''}`, 20, bloco_contatos + 17);
    doc.text(`Telefone: ${this.casal.contato_emergencia_telefone2 || ''}`, 20, bloco_contatos + 22);


    let bloco_endereco = 150;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`Endereço residencial`, 20, bloco_endereco);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Endereço: ${this.casal.endereco || ''}`, 20, bloco_endereco + 5);
    doc.text(`Bairro: ${this.casal.bairro || ''}`, 20, bloco_endereco + 10);
    doc.text(`Cidade: ${this.casal.cidade || ''}`, 100, bloco_endereco + 10);
    doc.text(`Cep: ${this.casal.cep || ''}`, 150, bloco_endereco + 10);


    let bloco_termos = 180;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`Com o pagamento da inscrição para o ECC concordamos com os seguintes termos:`, 20, bloco_termos);
    doc.setFont('helvetica', 'normal');
    doc.text('a)', 20, bloco_termos + 5);
    doc.text('Autorizamos a utilização do nosso nome nos eventos sociais do ECC e dos demais dados acima somente para controle de gestão e participação no ECC de acordo com a Lei Geral de Proteção de Dados Pessoais - Lei nº 13.709/18.', 30, bloco_termos + 5, { maxWidth: 150, align: "justify" })

    doc.text('b)', 20, bloco_termos + 20);
    doc.text('Em caso de desistência da participação no ECC, haverá a devolução dos seguintes porcentuais do valor da inscrição de acordo com a data solicitada:', 30, bloco_termos + 20, { maxWidth: 150, align: "justify" })

    doc.rect(40, 210, 60, 7);
    doc.rect(100, 210, 60, 7);
    doc.rect(40, 217, 60, 7);
    doc.rect(100, 224, 60, 7);
    doc.rect(40, 231, 60, 7);
    doc.rect(100, 217, 60, 7);
    doc.rect(40, 224, 60, 7);
    doc.rect(100, 231, 60, 7); // empty square

    doc.text('Data da Solicitação da Desistência', 42, 215);
    doc.text('- Até 30/06/2025', 42, 222);
    doc.text('- De 01/07 a 15/07/25', 42, 229);
    doc.text('- De 16/07/25 em diante', 42, 236);
    doc.text('Devolução do Valor da Inscrição', 102, 215);
    doc.text('100%', 130, 222, { align: 'center' });
    doc.text('50%', 130, 229, { align: 'center' });
    doc.text('0%', 130, 236, { align: 'center' });


    doc.text('Brasília - DF ____/____/_____', 20, 250);
    doc.text('Assinaturas', 20, 260);
    doc.text('Assinatura do Esposo', 20, 280);
    doc.text('Assinatura da Esposa', 120, 280);

    // Exibir o PDF em uma nova aba
    let pdfName = `Ficha_Casal_${this.casal.pessoas[0].nome_social}_${this.casal.pessoas[1].nome_social}`;
    doc.save('' + pdfName + '.pdf');
  }
}
