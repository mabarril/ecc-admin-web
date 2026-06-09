import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { UrlsUnicasService } from '../../services/urls-unicas.service';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatLabel } from '@angular/material/form-field';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { CasaisService } from '../../services/casais.service';
import { EventosService } from '../../services/eventos.service';
import { InscricoesService } from '../../services/inscricoes.service';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { Router } from '@angular/router';
import { FichaPdfComponent } from '../ficha-pdf/ficha-pdf';
import { Subject, takeUntil, forkJoin } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { MatMenuModule } from '@angular/material/menu';
import { Utils } from '../../services/utils';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { ExcelExportService } from '../../services/excel-export.service';
import { ListaFilhos } from '../lista-filhos/lista-filhos';
import { jsPDF } from 'jspdf';
import { Registro } from '../../models/registro.model';
import { BinaryOperator, TemplateLiteral } from '@angular/compiler';

interface Casal {
  id: number;
  nome_esposo: string;
  nome_esposa: string;
  // email_contato: string;
}

export interface ExportColumn {
  key: string;
  header: string;
  width?: number;
  formatter?: (value: any) => string;
}

interface Evento {
  id: number;
  nome: string;
  data_inicio: string;
  data_fim: string;
}

interface Inscricao {
  id: number;
  casal_id: number;
  evento_id: number;
  status: string;
  data_inscricao: string;
  tipo_participante: string;
  quarto: string;
  padrinho_id?: number; // Campo opcional para o padrinho
}

@Component({
  selector: 'app-lista-inscricao',
  imports: [
    MatCardModule,
    MatLabel,
    MatFormFieldModule,
    MatSelectModule,
    CommonModule,
    MatButtonModule,
    MatTableModule,
    MatInputModule,
    MatIconModule,
    MatCheckboxModule,
    ReactiveFormsModule,
    FichaPdfComponent,
    MatMenuModule,
    MatPaginatorModule,
    MatSortModule
  ],
  templateUrl: './lista-inscricao.html',
  styleUrl: './lista-inscricao.scss'
})
export class ListaInscricao implements OnInit {

  urlCompleta: string = '';
  readonly dialog = inject(MatDialog);
  listaCasais: Casal[] = [];
  eventos: Evento[] = [];
  loading = false;
  eventoSelecionado: number | null = null;
  inscricoes: Inscricao[] = [];
  listaInscritos = new MatTableDataSource<any>([]);
  listaInscritosOriginal: any[] = [];
  displayedColumns: string[] = ['id', 'nome', 'tipo_participante', 'status', 'actions'];
  fichaPdf?: FichaPdfComponent;
  private casaisMap: Map<number, any> = new Map();
  private destroy$ = new Subject<void>();
  utils = Utils;
  relacaoCasais: any[] = [];
  relacaoFilhos: any[] = [];

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;


  constructor(
    private casaisService: CasaisService,
    private inscricoesService: InscricoesService,
    private eventosService: EventosService,
    private urlsUnicasService: UrlsUnicasService,
    private router: Router,
    private snackBar: MatSnackBar,
    private excelExportService: ExcelExportService // Injeção do serviço de exportação
  ) { }

  ngOnInit(): void {
    const eventoSalvo = this.eventosService.getEventoSelecionado();
    if (eventoSalvo) {
      this.eventoSelecionado = eventoSalvo;
    }
    this.carregarDados();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  carregarDados(): void {
    this.loading = true;
    forkJoin({
      casais: this.casaisService.getCasais(),
      eventos: this.eventosService.getEventos()
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: ({ casais, eventos }) => {
        console.log('Casais:', casais);
        this.carregaListaCasais(casais);
        this.eventos = (eventos as Evento[] || []).sort((a: Evento, b: Evento) => b.id - a.id);
        this.loading = false;
        if (this.eventoSelecionado) {
          this.carregaInscricoes();
        }
      },
      error: (error) => {
        console.error('Erro ao carregar dados:', error);
        this.snackBar.open('Erro ao carregar dados', 'Fechar', { duration: 3000 });
        this.loading = false;
      }
    });
  }

  carregaListaCasais(casais: any[]): void {
    this.relacaoCasais = [...casais];
    console.log('rel ', this.relacaoCasais);
    this.listaCasais = casais.map(casal => {
      const esposo = casal.pessoas.find((p: any) => p.tipo === 'esposo')?.nome_social || '';
      const esposa = casal.pessoas.find((p: any) => p.tipo === 'esposa')?.nome_social || '';
      return {
        id: casal.id,
        nome: esposo + ' e ' + esposa,
        nome_esposo: esposo + ' da ' + esposa,
        nome_esposa: esposa + ' do ' + esposo,
        dados: casal
      };
    }).sort((a, b) => {
      const nomeA = a.nome_esposo.toLowerCase();
      const nomeB = b.nome_esposo.toLowerCase();
      if (nomeA !== nomeB) return nomeA.localeCompare(nomeB);
      return a.nome_esposa.toLowerCase().localeCompare(b.nome_esposa.toLowerCase());
    });
    this.casaisMap = new Map(this.listaCasais.map(casal => [casal.id, casal]));
  }

  private carregaInscricoes() {
    const eventoId = this.eventosService.getEventoSelecionado();
    if (!eventoId) return;
    this.inscricoesService.getInscricoesDoEvento(eventoId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (response: any) => {

        this.inscricoes = response || [];
        console.log('resp ', response);
        this.listaInscritos = this.inscricoes.map(inscricao => {
          const casal = this.casaisMap.get(inscricao.casal_id);
          return {
            id: inscricao.id,
            casal_id: inscricao.casal_id,
            evento_id: inscricao.evento_id,
            status: inscricao.status === 'confirmada' ? 'Confirmada' : 'Pendente',
            data_inscricao: inscricao.data_inscricao,
            tipo_participante: inscricao.tipo_participante,
            padrinho_id: inscricao.padrinho_id,
            casal: casal,
            quarto: inscricao.quarto
          };
        });
        this.listaInscritosOriginal = [...mapped];
        this.listaInscritos = new MatTableDataSource<any>(mapped);
        this.listaInscritos.paginator = this.paginator;
        
        this.listaInscritos.sortingDataAccessor = (item, property) => {
          switch (property) {
            case 'nome': return item.casal?.nome?.toLowerCase() || '';
            default: return item[property];
          }
        };
        
        this.listaInscritos.filterPredicate = (data, filter) => {
          return data.casal?.nome?.toLowerCase().includes(filter) || false;
        };
        
        this.listaInscritos.sort = this.sort;
        this.carregarListaFilhos(this.listaInscritosOriginal);
      },
      error: (error: HttpErrorResponse) => {
        console.error('Erro ao carregar inscrições:', error);
        this.snackBar.open('Erro ao carregar inscrições', 'Fechar', { duration: 3000 });
      }
    });
  }

  onEventoChange() {
    this.eventosService.setEventoSelecionado(this.eventoSelecionado || 0);
    this.carregaInscricoes();
  }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.listaInscritos.filter = filterValue.trim().toLowerCase();
  }

  editarCasal(casalId: number) {
    this.router.navigate(['/registro', casalId]);
  }

  deleteInscricao(inscricaoId: number) {
    const dialogRef = this.dialog.open(DialogConfirmarExclusao);
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.inscricoesService.deletarInscricao(inscricaoId).subscribe({
          next: () => {
            this.snackBar.open('Inscrição excluída com sucesso!', 'Fechar', { duration: 3000 });
            this.onEventoChange();
          },
          error: () => {
            this.snackBar.open('Erro ao excluir inscrição', 'Fechar', { duration: 3000 });
          }
        });
      }
    });
  }

  listaSeguro() {
    let listaSeguro: any[] = [];
    this.listaInscritos.map(participante => {
      console.log(participante);
      participante.casal.dados.pessoas.map((pessoa: any) => {
        listaSeguro.push({
          nome: pessoa.nome_completo,
          cpf: pessoa.cpf ? this.formataCpf(pessoa.cpf) : pessoa.cpf,
          data_nascimento: this.utils.formatarData(pessoa.data_nascimento),
          rg: pessoa.rg,
          orgao_emissor: pessoa.rg_emissor,
          sexo: pessoa.tipo === "esposo" ? "Masculino" : "Feminino",
          casal: pessoa.tipo === "esposo" ? participante.casal.nome_esposo : participante.casal.nome_esposa
        });
      });
    });

    const columns: ExportColumn[] = [
      { key: 'nome', header: 'Nome', width: 30 },
      { key: 'cpf', header: 'CPF', width: 25 },
      { key: 'data_nascimento', header: 'Dt. Nascimento', width: 20 },
      { key: 'rg', header: 'Identidade', width: 18 },
      { key: 'orgao_emissor', header: 'Orgão Emissor', width: 18 },
      { key: 'sexo', header: 'Sexo', width: 20 },
      { key: 'casal', header: 'Casal', width: 30 }
    ];

    listaSeguro.sort((a, b) => a.nome.localeCompare(b.nome));
    this.excelExportService.exportToExcel(listaSeguro, columns, { filename: 'Lista Seguro', includeTimestamp: true });
  }

  listaSeguroGeral() {
    let listaSeguro: any[] = [];
    this.relacaoCasais.map(participante => {
      const esposo = participante.pessoas.find((p: any) => p.tipo === 'esposo')?.nome_social;
      const esposa = participante.pessoas.find((p: any) => p.tipo === 'esposa')?.nome_social;
      participante.pessoas.map((pessoa: any) => {
        listaSeguro.push({
          nome: pessoa.nome_completo,
          cpf: pessoa.cpf ? this.formataCpf(pessoa.cpf) : pessoa.cpf,
          data_nascimento: this.utils.formatarData(pessoa.data_nascimento),
          rg: pessoa.rg,
          orgao_emissor: pessoa.rg_emissor,
          sexo: pessoa.tipo === "esposo" ? "Masculino" : "Feminino",
          casal: pessoa.tipo === "esposo" ? esposo + ' da ' + esposa : esposa + ' do ' + esposo,
        });
      });
    });

    const columns: ExportColumn[] = [
      { key: 'nome', header: 'Nome', width: 30 },
      { key: 'cpf', header: 'CPF', width: 25 },
      { key: 'data_nascimento', header: 'Dt. Nascimento', width: 20 },
      { key: 'rg', header: 'Identidade', width: 18 },
      { key: 'orgao_emissor', header: 'Orgão Emissor', width: 18 },
      { key: 'sexo', header: 'Sexo', width: 20 },
      { key: 'casal', header: 'Casal', width: 30 }
    ];

    listaSeguro.sort((a, b) => a.nome.localeCompare(b.nome));
    this.excelExportService.exportToExcel(listaSeguro, columns, { filename: 'Lista Seguro Geral', includeTimestamp: true });
  }

  listaInscritosParaExcel() {
    let lista: any[] = [];
    let padrinho: any;
    this.listaInscritos.map(casal => {
      padrinho = '';
      const esposo = casal.casal.dados.pessoas.find((p: any) => p.tipo === 'esposo');
      const esposa = casal.casal.dados.pessoas.find((p: any) => p.tipo === 'esposa');
      if (casal.tipo_participante === "convidado") {
        padrinho = this.listaInscritosOriginal.find((p: any) => p.casal_id === casal.padrinho_id)?.casal.nome;
      }
      lista.push({
        id: casal.id,
        casal: esposo.nome_social + ' e ' + esposa.nome_social,
        quarto: casal.quarto,
        padrinho: padrinho ? padrinho : '',
        nome_esposo: esposo.nome_social,
        nome_completo_esposo: esposo.nome_completo,
        email_esposo: esposo.email_contato,
        dn_esposo: esposo.data_nascimento ? this.utils.formatarData(esposo.data_nascimento) : null,
        profissao_esposo: esposo.profissao,
        rg_esposo: esposo.rg,
        orgao_emissor_esposo: esposo.rg_emissor,
        cpf_esposo: esposo.cpf ? this.formataCpf(esposo.cpf) : esposo.cpf,
        diabetico_esposo: esposo.diabetico,
        religiao_esposo: esposo.religiao,
        celular_esposo: esposo.celular,

        nome_esposa: esposa.nome_social,
        nome_completo_esposa: esposa.nome_completo,
        email_esposa: esposa.email_contato,
        dn_esposa: esposa.data_nascimento ? this.utils.formatarData(esposa.data_nascimento) : null,
        profissao_esposa: esposa.profissao,
        rg_esposa: esposa.rg,
        orgao_emissor_esposa: esposa.rg_emissor,
        cpf_esposa: esposa.cpf ? this.formataCpf(esposa.cpf) : esposa.cpf,
        diabetico_esposa: esposa.diabetico,
        religiao_esposa: esposa.religiao,
        celular_esposa: esposa.celular,

        dt_casamento: casal.casal.dados.data_casamento ? this.utils.formatarData(casal.casal.dados.data_casamento) : null,
        endereco: casal.casal.dados.endereco,
        bairro: casal.casal.dados.bairro,
        cidade: casal.casal.dados.cidade,
        emergencia_1: casal.casal.dados.contato_emergencia_nome1,
        tel_emergencia_1: casal.casal.dados.contato_emergencia_telefone1,
        emergencia_2: casal.casal.dados.contato_emergencia_nome2,
        tel_emergencia_2: casal.casal.dados.contato_emergencia_telefone2,
      });
    });

    const columns: ExportColumn[] = [
      { key: 'id', header: 'Código Inscrição' },
      { key: 'casal', header: 'Casal' },
      { key: 'padrinho', header: 'Padrinho' },
      { key: 'quarto', header: 'Quarto' },
      { key: 'nome_esposo', header: 'None Esposo' },
      { key: 'nome_completo_esposo', header: 'Nome Completo Esposo' },
      { key: 'email_esposo', header: 'E-mail Esposo' },
      { key: 'dn_esposo', header: 'Dt. Nascimento Esposo' },
      { key: 'profissao_esposo', header: 'Profissão Esposo' },
      { key: 'rg_esposo', header: 'Rg Esposo' },
      { key: 'orgao_emissor_esposo', header: 'Orgão Emissor Esposo' },
      { key: 'cpf_esposo', header: 'Cpf Esposo' },
      { key: 'diabetico_esposo', header: 'Diabetico Esposo' },
      { key: 'religiao_esposo', header: 'Religiao Esposo' },
      { key: 'celular_esposo', header: 'Celular Esposo' },
      { key: 'nome_esposa', header: 'None Esposa' },
      { key: 'nome_completo_esposa', header: 'Nome Completo Esposa' },
      { key: 'email_esposa', header: 'E-mail Esposa' },
      { key: 'dn_esposa', header: 'Dt. Nascimento Esposa' },
      { key: 'profissao_esposa', header: 'Profissão Esposa' },
      { key: 'rg_esposa', header: 'Rg Esposa' },
      { key: 'orgao_emissor_esposa', header: 'Orgão Emissor Esposa' },
      { key: 'cpf_esposa', header: 'Cpf Esposa' },
      { key: 'diabetico_esposa', header: 'Diabetico Esposa' },
      { key: 'religiao_esposa', header: 'Religiao Esposa' },
      { key: 'celular_esposa', header: 'Celular Esposa' },
      { key: 'dt_casamento', header: 'Dt. Casamento' },
      { key: 'endereco', header: 'Endereço' },
      { key: 'bairro', header: 'Bairro' },
      { key: 'cidade', header: 'Cidade' },
      { key: 'emergencia_1', header: 'Emergência 1' },
      { key: 'tel_emergencia_1', header: 'Celular 1' },
      { key: 'emergencia_2', header: 'Emergência 2' },
      { key: 'tel_emergencia_2', header: 'Celular 2' },
    ];

    lista.sort((a, b) => a.casal.localeCompare(b.casal));
    this.excelExportService.exportToExcel(lista, columns, { filename: 'Lista Geral', sheetName: 'Lista Geral', includeTimestamp: true });
  }

  listaGeral() {
    let lista: any[] = [];
    this.relacaoCasais.map(casal => {
      const esposo = casal.pessoas.find((p: any) => p.tipo === 'esposo');
      const esposa = casal.pessoas.find((p: any) => p.tipo === 'esposa');
      lista.push({
        casal: esposo.nome_social + ' e ' + esposa.nome_social,
        id_casal: casal.id,

        nome_esposo: esposo.nome_social,
        nome_completo_esposo: esposo.nome_completo,
        email_esposo: esposo.email_contato,
        dn_esposo: esposo.data_nascimento,
        profissao_esposo: esposo.profissao,
        rg_esposo: esposo.rg,
        orgao_emissor_esposo: esposo.rg_emissor,
        cpf_esposo: esposo.cpf ? this.formataCpf(esposo.cpf) : esposo.cpf,
        diabetico_esposo: esposo.diabetico,
        religiao_esposo: esposo.religiao,
        celular_esposo: esposo.celular,

        nome_esposa: esposa.nome_social,
        nome_completo_esposa: esposa.nome_completo,
        email_esposa: esposa.email_contato,
        dn_esposa: esposa.data_nascimento,
        profissao_esposa: esposa.profissao,
        rg_esposa: esposa.rg,
        orgao_emissor_esposa: esposa.rg_emissor,
        cpf_esposa: esposa.cpf ? this.formataCpf(esposa.cpf) : esposa.cpf,
        diabetico_esposa: esposa.diabetico,
        religiao_esposa: esposa.religiao,
        celular_esposa: esposa.celular,

        dt_casamento: casal.data_casamento,
        endereco: casal.endereco,
        bairro: casal.bairro,
        cidade: casal.cidade,
        emergencia_1: casal.contato_emergencia_nome1,
        tel_emergencia_1: casal.contato_emergencia_telefone1,
        emergencia_2: casal.contato_emergencia_nome2,
        tel_emergencia_2: casal.contato_emergencia_telefone2,
      });
    });

    const columns: ExportColumn[] = [
      { key: 'casal', header: 'Casal', width: 30 },
      { key: 'id_casal', header: 'id', width: 25 },
      { key: 'nome_esposo', header: 'None Esposo', width: 50 },
      { key: 'nome_completo_esposo', header: 'Nome Completo Esposo', width: 50 },
      { key: 'email_esposo', header: 'E-mail Esposo', width: 18 },
      { key: 'dn_esposo', header: 'Dt. Nascimento Esposo', width: 20 },
      { key: 'profissao_esposo', header: 'Profissão Esposo', width: 30 },
      { key: 'rg_esposo', header: 'Rg Esposo', width: 30 },
      { key: 'orgao_emissor_esposo', header: 'Orgão Emissor Esposo', width: 30 },
      { key: 'cpf_esposo', header: 'Cpf Esposo', width: 30 },
      { key: 'diabetico_esposo', header: 'Diabetico Esposo', width: 30 },
      { key: 'religiao_esposo', header: 'Religiao Esposo', width: 30 },
      { key: 'celular_esposo', header: 'Celular Esposo', width: 30 },
      { key: 'nome_esposa', header: 'None Esposa', width: 50 },
      { key: 'nome_completo_esposa', header: 'Nome Completo Esposa', width: 50 },
      { key: 'email_esposa', header: 'E-mail Esposa', width: 18 },
      { key: 'dn_esposa', header: 'Dt. Nascimento Esposa', width: 20 },
      { key: 'profissao_esposa', header: 'Profissão Esposa', width: 30 },
      { key: 'rg_esposa', header: 'Rg Esposa', width: 30 },
      { key: 'orgao_emissor_esposa', header: 'Orgão Emissor Esposa', width: 30 },
      { key: 'cpf_esposa', header: 'Cpf Esposa', width: 30 },
      { key: 'diabetico_esposa', header: 'Diabetico Esposa', width: 30 },
      { key: 'religiao_esposa', header: 'Religiao Esposa', width: 30 },
      { key: 'celular_esposa', header: 'Celular Esposa', width: 30 },

      { key: 'dt_casamento', header: 'Dt. Casamento', width: 30 },
      { key: 'endereco', header: 'Endereço', width: 30 },
      { key: 'bairro', header: 'Bairro', width: 30 },
      { key: 'cidade', header: 'Cidade', width: 30 },
      { key: 'emergencia_1', header: 'Emergência 1', width: 30 },
      { key: 'tel_emergencia_1', header: 'Celular 1', width: 30 },
      { key: 'emergencia_2', header: 'Emergência 2', width: 30 },
      { key: 'tel_emergencia_2', header: 'Celular 2', width: 30 },
    ];

    lista.sort((a, b) => a.casal.localeCompare(b.casal));
    this.excelExportService.exportToExcel(lista, columns, { filename: 'Lista Geral', sheetName: 'Lista Geral', includeTimestamp: true });
  }

  formataCpf(valor: string) {
    valor = valor.replace(/(\.|\/|\-)/g, "");
    return valor.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/g, "\$1.\$2.\$3\-\$4");
  }

  listaOnibus() {
    const novaRelacao: any[] = [];
    this.listaInscritos.forEach((casal: any) => {
      // A interface Pessoa é uma suposição, ajuste se o tipo for outro.
      if (casal.tipo_participante === "convidado" || casal.casal_id === 247) {
        const esposo = casal.casal.dados.pessoas.find((p: any) => p.tipo === 'esposo');
        const esposa = casal.casal.dados.pessoas.find((p: any) => p.tipo === 'esposa');

        if (esposo) {
          novaRelacao.push({
            nome: esposo.nome_completo ?? '',
            rg: esposo.rg ?? '',
            orgao: esposo.rg_emissor ?? '',
            cpf: this.formataCpf(esposo.cpf) ?? '',
          });
        }

        if (esposa) {
          novaRelacao.push({
            nome: esposa.nome_completo ?? '',
            rg: esposa.rg ?? '',
            orgao: esposa.rg_emissor ?? '',
            cpf: this.formataCpf(esposa.cpf) ?? '',
          });
        }
      }
    });
    novaRelacao.sort((a, b) => a.nome.localeCompare(b.nome));

    let pdf = new jsPDF();
    pdf.rect(15, 10, 180, 15); // empty square
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(14);
    pdf.text(`ENCONTRO DE CASAIS COM CRISTO (ECC)`, 105, 15, { align: 'center' });
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(12);
    pdf.text(`Relacao de Passageiros - 01/08/25 a 03/08/25`, 105, 22, { align: 'center' });

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(12);
    pdf.text(`Origem: Brasília - DF`, 20, 35, { align: 'left' });
    pdf.text(`Destino: Brasília - DF`, 105, 35, { align: 'left' })

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);

    let linha = 40;
    for (const item of novaRelacao) {
      linha += 5;
      pdf.text(item.nome, 20, linha);
      pdf.text(item.rg, 105, linha);
      pdf.text(item.orgao, 135, linha);
      pdf.text(item.cpf, 160, linha);
    }

    pdf.save('lista.pdf');

    const columns: ExportColumn[] = [
      { key: 'nome', header: 'Nome', width: 30 },
      { key: 'rg', header: 'Identidade', width: 18 },
      { key: 'orgao', header: 'Orgão Emissor', width: 18 },
      { key: 'cpf', header: 'CPF', width: 25 }
    ];

    this.excelExportService.exportToExcel(novaRelacao, columns, { filename: 'Lista Passageiros' });

  }


  relacaoHotel() {
    let novaRelacao: any[] = [];
    console.log('lista ', this.listaInscritos);
    this.listaInscritos.forEach((casal: any) => {
      const esposo = casal.casal.dados.pessoas.find((p: any) => p.tipo === 'esposo');
      const esposa = casal.casal.dados.pessoas.find((p: any) => p.tipo === 'esposa');
      let reg = {
        esposo_nome: esposo.nome_completo,
        esposo_rg: esposo.rg,
        esposo_orgao: esposo.rg_emissor,
        esposo_cpf: esposo.cpf ? this.formataCpf(esposo.cpf) : "",
        esposa_nome: esposa.nome_completo,
        esposa_rg: esposa.rg,
        esposa_orgao: esposa.rg_emissor,
        esposa_cpf: esposa.cpf ? this.formataCpf(esposa.cpf) : "",
        quarto: casal.quarto,
      }
      novaRelacao.push(reg);
    });

    novaRelacao.sort((a, b) => a.esposo_nome.localeCompare(b.esposo_nome));

    let pdf = new jsPDF();
    pdf.rect(15, 10, 180, 15); // empty square
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(14);
    pdf.text(`ENCONTRO DE CASAIS COM CRISTO (ECC)`, 105, 15, { align: 'center' });
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(12);
    pdf.text(`Relacao de Quartos Afilhados`, 105, 22, { align: 'center' });
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    let linha = 30;
    pdf.text('Nome Esposo', 20, linha);
    pdf.text('Nome Esposa', 100, linha);
    pdf.text('Quarto', 160, linha);
    linha += 3;
    pdf.text('RG', 20, linha);
    pdf.text('RG', 100, linha);
    pdf.text('CPF', 60, linha);
    pdf.text('CPF', 140, linha);
    linha += 1;
    pdf.setLineWidth(0.1);
    pdf.line(20, linha, 180, linha);
    pdf.setFont('helvetica', 'normal');
    let page = 1;
    for (const item of novaRelacao) {
      linha += 5;
      pdf.text(item.esposo_nome, 20, linha);
      pdf.text(item.esposa_nome, 100, linha);
      pdf.text(item.quarto, 160, linha);
      linha += 5;
      pdf.text(item.esposo_rg, 20, linha);
      pdf.text(item.esposa_rg, 100, linha);
      pdf.text(item.esposo_orgao, 40, linha);
      pdf.text(item.esposa_orgao, 120, linha);
      pdf.text(item.esposo_cpf, 60, linha);
      pdf.text(item.esposa_cpf, 140, linha);
      if (linha > 260) {
        pdf.text('Página ' + page, 180, 285, { align: 'right' });
        page++;
        pdf.addPage();
        pdf.rect(15, 10, 180, 15); // empty square
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(14);
        pdf.text(`ENCONTRO DE CASAIS COM CRISTO (ECC)`, 105, 15, { align: 'center' });
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(12);
        pdf.text(`Relacao de Quartos Afilhados`, 105, 22, { align: 'center' });
        pdf.setFontSize(8);
        linha = 30;
      } 
      pdf.text('Página ' + page, 180, 285, { align: 'right' });
    }
    pdf.save('RelacaoHotel.pdf');
  }

  relacaoQuartoAfilhados() {
    let novaRelacao: any[] = [];
    this.listaInscritos.forEach((casal: any) => {
      // A interface Pessoa é uma suposição, ajuste se o tipo for outro.
      if (casal.tipo_participante === "convidado") {
        let reg = {
          nome: casal.casal.nome,
          quarto: casal.quarto,
          padrinho: casal.padrinho_id ? this.listaInscritosOriginal.find((p: any) => p.casal_id === casal.padrinho_id)?.casal.nome : '',
          quarto_padrinho: casal.padrinho_id ? this.listaInscritosOriginal.find((p: any) => p.casal_id === casal.padrinho_id)?.quarto : '',
        }
        novaRelacao.push(reg);
      }

    });

    novaRelacao.sort((a, b) => a.nome.localeCompare(b.nome));

    const col = ['nome', 'quarto', 'padrinho', 'quarto_padrinho'];
    novaRelacao.sort((a, b) => a.nome.localeCompare(b.nome));
    this.utils.generatePdf(col, novaRelacao, 'Relação de Quarto Afilhados');
  }

  
  relacaoRecepcao() {
    let novaRelacao: any[] = [];
    this.listaInscritos.forEach((casal: any) => {
      // A interface Pessoa é uma suposição, ajuste se o tipo for outro.
      if (casal.tipo_participante === "convidado") {
        let padrinho = this.listaInscritosOriginal.find((p: any) => p.casal_id === casal.padrinho_id);
        let reg = {
          nome: casal.casal.nome,
          quarto: casal.quarto,
          endereco: casal.casal.dados.endereco,
          bairro: casal.casal.dados.bairro,
          cidade: casal.casal.dados.cidade,
          telefoneEsposo: casal.casal.dados.pessoas.find((p: any) => p.tipo === 'esposo')?.celular || '',
          telefoneEsposa: casal.casal.dados.pessoas.find((p: any) => p.tipo === 'esposa')?.celular || '',
          padrinho: padrinho ? padrinho.casal.nome : '',
          telefonePadrinho: padrinho.casal.dados.pessoas.find((p: any) => p.tipo === 'esposo')?.celular,
          telefoneMadrinha: padrinho.casal.dados.pessoas.find((p: any) => p.tipo === 'esposa')?.celular,
        }
        novaRelacao.push(reg);
      }

    });

    

    novaRelacao.sort((a, b) => a.nome.localeCompare(b.nome));

     let pdf = new jsPDF("landscape");
    // pdf.rect(15, 5, 250, 15); // empty square
    // pdf.setFont('helvetica', 'bold');
    // pdf.setFontSize(14);
    // pdf.text(`ENCONTRO DE CASAIS COM CRISTO (ECC)`, 120, 15, { align: 'center' });
    // pdf.setFont('helvetica', 'normal');
    // pdf.setFontSize(12);
    pdf.text(`Relação Afilhados e Padrinhos - Recepção`, 150, 5, { align: 'center' });
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    let linha = 10;
    pdf.text('Afilhado', 20, linha);
    pdf.text('Quarto', 55, linha);
    pdf.text('Endereco', 65, linha);
    pdf.text('Bairro', 170, linha);
    pdf.text('Cidade', 200, linha);
    pdf.text('Tel.Esposo', 220, linha);
    pdf.text('Tel. Esposa', 250, linha);
    linha += 3;
    pdf.text('Padrinhos: ', 20, linha);
    pdf.text('Tel. Padrinho', 55, linha);
    pdf.text('Tel. Madrinha', 85, linha);
    // linha += 1;
    // pdf.setLineWidth(0.1);
    // pdf.line(20, linha, 180, linha);

    pdf.setFont('helvetica', 'normal');
    let page = 1;
    let row = true;
    for (const item of novaRelacao) {
      linha += 5;
      if (row) {
        pdf.setFillColor("#cecfd6"); // Light gray background
        pdf.rect(15, linha - 3.5, 270, 8, 'F'); // Fill rectangle
        row = false;
      } else {
        row = true;
      }
      pdf.text(item.nome, 20, linha);
      pdf.text(item.quarto, 55, linha);
      pdf.text(item.endereco, 65, linha);
      pdf.text(item.bairro, 170, linha);
      pdf.text(item.cidade, 200, linha);
      pdf.text(item.telefoneEsposo? this.utils.formataCelular(item.telefoneEsposo) : '', 220, linha);
      pdf.text(item.telefoneEsposa? this.utils.formataCelular(item.telefoneEsposa) : '', 250, linha);
      linha += 3;
      pdf.text(item.padrinho, 20, linha);
      pdf.text(item.telefonePadrinho? this.utils.formataCelular(item.telefonePadrinho) : '', 55, linha);
      pdf.text(item.telefoneMadrinha? this.utils.formataCelular(item.telefoneMadrinha) : '', 85, linha);
      if (linha > 260) {
        pdf.text('Página ' + page, 180, 285, { align: 'right' });
        page++;
        pdf.addPage();
        pdf.rect(15, 10, 180, 15); // empty square
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(14);
        pdf.text(`ENCONTRO DE CASAIS COM CRISTO (ECC)`, 105, 15, { align: 'center' });
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(12);
        pdf.text(`Relacao de Quartos Afilhados`, 105, 22, { align: 'center' });
        pdf.setFontSize(8);
        linha = 30;
      } 
      pdf.text('Página ' + page, 180, 285, { align: 'right' });
    }
    pdf.save('Recepção.pdf');

    // const col = ['nome', 'quarto', 'endereco', 'telefoneEsposo', 'telefoneEsposa', 'telefonePadrinho', 'telefoneMadrinha'];
    // novaRelacao.sort((a, b) => a.nome.localeCompare(b.nome));
    // this.utils.generatePdf(col, novaRelacao, 'Relação Recepção');
  }

  // ========== MÉTODOS DE EXPORTAÇÃO PARA EXCEL ==========

  /**
   * Exporta a lista completa de inscritos para Excel
   */
  exportarListaInscritosExcel(): void {
    try {
      if (!this.listaInscritos || this.listaInscritos.length === 0) {
        this.snackBar.open('Nenhum dado disponível para exportação', 'Fechar', { duration: 3000 });
        return;
      }

      const nomeEvento = this.getNomeEventoSelecionado();
      console.log('inc ', this.listaInscritos);
      this.excelExportService.exportListaInscritos(this.listaInscritos, nomeEvento);

      this.snackBar.open('Lista de inscritos exportada com sucesso!', 'Fechar', {
        duration: 3000,
        panelClass: ['success-snackbar']
      });
    } catch (error) {
      console.error('Erro ao exportar lista de inscritos:', error);
      this.snackBar.open('Erro ao exportar lista de inscritos', 'Fechar', { duration: 3000 });
    }
  }

  /**
   * Exporta lista de dietas alimentares para Excel
   */
  exportarListaDietasExcel(): void {
    try {
      this.excelExportService.exportListaDietas(this.listaInscritos);
      this.snackBar.open('Lista de dietas alimentares exportada com sucesso!', 'Fechar', {
        duration: 3000,
        panelClass: ['success-snackbar']
      });
    } catch (error) {
      console.error('Erro ao exportar lista de dietas:', error);
      this.snackBar.open('Erro ao exportar lista de dietas', 'Fechar', { duration: 3000 });
    }
  }

  /**
   * Exporta lista de diabéticos para Excel
   */
  exportarListaDiabeticosExcel(): void {
    try {
      this.excelExportService.exportListaDiabeticos(this.listaInscritos);
      this.snackBar.open('Lista de diabéticos exportada com sucesso!', 'Fechar', {
        duration: 3000,
        panelClass: ['success-snackbar']
      });
    } catch (error) {
      console.error('Erro ao exportar lista de diabéticos:', error);
      this.snackBar.open('Erro ao exportar lista de diabéticos', 'Fechar', { duration: 3000 });
    }
  }

  /**
   * Exporta lista de afilhados para Excel
   */
  exportarListaAfilhadosExcel(): void {
    try {
      this.excelExportService.exportListaAfilhados(this.listaInscritos, this.casaisMap);
      this.snackBar.open('Lista de afilhados exportada com sucesso!', 'Fechar', {
        duration: 3000,
        panelClass: ['success-snackbar']
      });
    } catch (error) {
      console.error('Erro ao exportar lista de afilhados:', error);
      this.snackBar.open('Erro ao exportar lista de afilhados', 'Fechar', { duration: 3000 });
    }
  }

  /**
   * Obtém o nome do evento selecionado
   */
  private getNomeEventoSelecionado(): string {
    if (!this.eventoSelecionado) return '';
    const evento = this.eventos.find(e => e.id === this.eventoSelecionado);
    return evento?.nome || '';
  }

  // ========== MÉTODOS ORIGINAIS MANTIDOS ==========

  geraListaRestaurante() {
    let listaRestaurante: any[] = [];
    this.listaInscritos.map(participante => {
      participante.casal.dados.pessoas.map((pessoa: any) => {
        if (pessoa.dieta_alimentar !== "não") {
          let nome = '';
          if (pessoa.tipo === 'esposo') {
            nome = participante.casal.nome_esposo;
          } else {
            nome = participante.casal.nome_esposa;
          }
          listaRestaurante.push({
            nome: nome,
            dieta: pessoa.dieta_alimentar,
            tipo: participante.tipo_participante,
          });
        }
      });
    });
    const col = ['nome', 'dieta', 'tipo'];
    listaRestaurante.sort((a, b) => a.nome.localeCompare(b.nome));
    this.utils.generatePdf(col, listaRestaurante, 'Dieta Alimentar');
  }

  geraListaDiabeticos() {
    let listaDiabeticos: any[] = [];
    this.listaInscritos.map(participante => {
      participante.casal.dados.pessoas.map((pessoa: any) => {
        if (pessoa.diabetico === true) {
          let nome = '';
          if (pessoa.tipo === 'esposo') {
            nome = participante.casal.nome_esposo;
          } else {
            nome = participante.casal.nome_esposa;
          }
          listaDiabeticos.push({
            nome: nome,
            diabético: "SIM",
            tipo: participante.tipo_participante,
          });
        }
      });
    });
    const col = ['nome', 'diabético', 'tipo'];
    listaDiabeticos.sort((a, b) => a.nome.localeCompare(b.nome));
    this.utils.generatePdf(col, listaDiabeticos, 'Lista Diabéticos');
  }

  geraListaAfilhados() {
    let listaAfilhados: any[] = [];
    this.listaInscritos.filter(inscricao => inscricao.tipo_participante === 'convidado').forEach(participante => {
      listaAfilhados.push({
        convidado: participante.casal.nome,
        padrinho: participante.padrinho_id ? this.casaisMap.get(participante.padrinho_id)?.nome : 'Não definido',
      }
      );
    });
    const col = ['convidado', 'padrinho'];
    listaAfilhados.sort((a, b) => a.convidado.localeCompare(b.convidado));
    this.utils.generatePdf(col, listaAfilhados, 'Lista Afilhados');
  }




  carregarListaFilhos(inscritos: any[]) {
    this.relacaoFilhos = [];
    inscritos.forEach((casal: any) => {
      // A interface Pessoa é uma suposição, ajuste se o tipo for outro.
      if (casal.tipo_participante === "convidado") {
        console.log(casal);
        this.casaisService.getCasaisById(casal.casal_id).subscribe({
          next: (response: any) => {
            if (response.filhos?.length > 0) {
              response.filhos?.forEach((filho: any) => {
                this.relacaoFilhos.push({
                  nome: casal.casal.nome,
                  nome_filho: filho.nome_completo,
                  data_nascimento: filho.data_nascimento
                });
              });
            }
          }
        });
      }
    });
  }

  gerarListagemFilhos() {

    this.relacaoFilhos.sort((a, b) => a.nome.localeCompare(b.nome));

    const columns: ExportColumn[] = [
      { key: 'nome', header: 'Casal', width: 30 },
      { key: 'nome_filho', header: 'Filho', width: 30 },
      { key: 'data_nascimento', header: 'Dt. Nascimento', width: 30 },
    ];

    this.excelExportService.exportToExcel(this.relacaoFilhos, columns, { filename: 'Filhos ', includeTimestamp: true });
  }

  openDialogInscricao(enterAnimationDuration: string, exitAnimationDuration: string): void {
    const dialogRef = this.dialog.open(DialogInscricao, {
      data: { casais: this.listaCasais, eventos: this.eventoSelecionado },
      width: '500px',
      enterAnimationDuration,
      exitAnimationDuration,
    });
    dialogRef.afterClosed().subscribe(() => {
      this.ngOnInit(); // Recarrega os dados após o fechamento do diálogo
    });
  }

  copiarUrl(inscricao: any) {
    this.urlsUnicasService.urlCompleta(inscricao.id).subscribe({
      next: (response: any) => {
        this.urlCompleta = response.urlCompleta;
        this.copiarParaClipboard(this.urlCompleta);
      },
      error: (error) => {
        console.error('Erro ao obter URL completa:', error);
        this.snackBar.open('Erro ao obter URL completa', 'Fechar', { duration: 3000 });
      }
    });
  }

  copiarParaClipboard(texto: string) {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(texto).then(() => {
        this.snackBar.open('URL copiada para a área de transferência!', 'Fechar', { duration: 3000 });
      }, (err) => {
        console.error('Erro ao copiar para a área de transferência:', err);
        this.snackBar.open('Falha ao copiar URL para a área de transferência', 'Fechar', { duration: 3000 });
      });
    } else {
      const textarea = document.createElement('textarea');
      textarea.value = texto;
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
        this.snackBar.open('URL copiada para a área de transferência!', 'Fechar', { duration: 3000 });
      } catch (err) {
        console.error('Erro ao copiar para a área de transferência (fallback):', err);
        this.snackBar.open('Falha ao copiar URL para a área de transferência', 'Fechar', { duration: 3000 });
      } finally {
        document.body.removeChild(textarea);
      }
    }
  }

  cadastrarCasal() {
    this.router.navigate(['/registro']);
  }

  generatePdf() {
    let col = [...this.displayedColumns];
    col.pop(); // Remove 'actions' column for PDF export
    let lista = this.listaInscritos.map(inscricao => {
      return {
        id: inscricao.id,
        tipo_participante: inscricao.tipo_participante,
        status: inscricao.status,
        nome: inscricao.casal.nome
      };
    });
    this.utils.generatePdf(col, lista, 'Lista de Inscritos');
  }
}

// ========== COMPONENTES DE DIÁLOGO MANTIDOS ==========

@Component({
  selector: 'dialog-inscricao',
  templateUrl: 'dialog-inscricao.html',
  styleUrls: ['./lista-inscricao.scss'],
  imports: [CommonModule, MatDialogModule, MatCardModule, MatCheckboxModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule, ReactiveFormsModule, MatIconModule, MatAutocompleteModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DialogInscricao {

  conviteForm: FormGroup;
  readonly dialogRef = inject(MatDialogRef<DialogInscricao>);
  readonly data = inject<{ casais: any[], eventos: number }>(MAT_DIALOG_DATA);
  readonly listaCasais = this.data.casais;
  readonly eventos = this.data.eventos;
  readonly inscricao = new FormControl(false);

  urlCompleta = '';
  casalAtual: Casal | undefined;
  loading = false;
  enviandoConvite = false;
  afilhado = false;

  filteredCasais: any[] = [];
  filteredPadrinhos: any[] = [];

  constructor(
    private fb: FormBuilder,
    private snackBar: MatSnackBar,
    private urlsUnicasService: UrlsUnicasService,
    private inscricoesService: InscricoesService,
    private eventosService: EventosService
  ) {
    this.conviteForm = this.fb.group({
      casal_id: ['', Validators.required],
      padrinho_id: [''], // Campo para selecionar o padrinho
      evento_id: this.data.eventos, // Preenche com o evento selecionado
      url_inscricao: [''],
    });

    this.filteredCasais = this.listaCasais;
    this.filteredPadrinhos = this.listaCasais;

    this.conviteForm.get('casal_id')?.valueChanges.subscribe(value => {
      const filterValue = typeof value === 'string' ? value.toLowerCase() : (value?.nome?.toLowerCase() || '');
      this.filteredCasais = this.listaCasais.filter(casal => casal.nome.toLowerCase().includes(filterValue));
    });

    this.conviteForm.get('padrinho_id')?.valueChanges.subscribe(value => {
      const filterValue = typeof value === 'string' ? value.toLowerCase() : (value?.nome?.toLowerCase() || '');
      this.filteredPadrinhos = this.listaCasais.filter(casal => casal.nome.toLowerCase().includes(filterValue));
    });
  }

  changeAfilhado() {
    this.afilhado = !this.afilhado;
  }

  displayCasalFn(casal: any): string {
    return casal ? casal.nome : '';
  }

  inscreverCasal(): void {
    this.enviandoConvite = true;
    let casalVal = this.conviteForm.value.casal_id;
    let padrinhoVal = this.conviteForm.value.padrinho_id;

    let casalId = typeof casalVal === 'object' ? casalVal.id : casalVal;
    let padrinhoId = typeof padrinhoVal === 'object' ? padrinhoVal.id : padrinhoVal;

    let inscricao = {
      casal_id: casalId,
      evento_id: this.eventosService.getEventoSelecionado(),
      tipo_participante: this.afilhado ? 'convidado' : 'encontrista',
      status: 'pendente',
      padrinho_id: this.afilhado ? padrinhoId : 0,
    };

    this.inscricoesService.registrarInscricao(inscricao)
      .subscribe({
        next: (response: any) => {
          this.enviandoConvite = false;
          this.conviteForm.value.url_inscricao = response.data.urlCompleta;
          this.urlCompleta = response.data.urlCompleta;

          if (response && response.data && response.data[0]) {
            this.snackBar.open('Inscrição realizada com sucesso!', 'Fechar', {
              duration: 5000,
              panelClass: ['success-snackbar']
            });
            this.dialogRef.close();
          }
        },
        error: (error) => {
          this.enviandoConvite = false;
          console.error('Erro ao inscrever casal:', error);
          this.snackBar.open(
            error.error?.message || 'Erro ao inscrever casal',
            'Fechar',
            { duration: 3000 }
          );
        }
      });
  }

  enviarConvite(): void {
    if (this.conviteForm.valid) {
      this.urlsUnicasService.gerarConvite(this.conviteForm.value)
        .subscribe({
          next: (response: any) => {
            this.enviandoConvite = false;
            this.conviteForm.value.url_inscricao = response.data.urlCompleta;
            this.urlCompleta = response.data.urlCompleta;

            if (response && response.data && response.data[0]) {
              this.snackBar.open('URL de convite gerada com sucesso!', 'Fechar', {
                duration: 5000,
                panelClass: ['success-snackbar']
              });
            }
          },
          error: (error) => {
            this.enviandoConvite = false;
            console.error('Erro ao enviar convite:', error);
            this.snackBar.open(
              error.error?.message || 'Erro ao enviar convite',
              'Fechar',
              { duration: 3000 }
            );
          }
        });
    }
  }
}

@Component({
  selector: 'dialog-confirmar-exclusao',
  template: `
    <h2 mat-dialog-title>Confirmar Exclusão</h2>
    <mat-dialog-content>
      Tem certeza que deseja excluir esta inscrição?
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Cancelar</button>
      <button mat-raised-button color="warn" (click)="onConfirm()">Excluir</button>
    </mat-dialog-actions>
  `,
  standalone: true,
  imports: [MatButtonModule, MatDialogModule, CommonModule],
})
export class DialogConfirmarExclusao {
  constructor(
    public dialogRef: MatDialogRef<DialogConfirmarExclusao>
  ) { }

  onCancel(): void {
    this.dialogRef.close(false);
  }

  onConfirm(): void {
    this.dialogRef.close(true);
  }
}

