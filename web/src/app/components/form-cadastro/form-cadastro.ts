import { Component } from '@angular/core';
import { inject, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { InscricoesService } from '../../services/inscricoes.service';
import { Registro, RegistroRecord } from '../../models/registro.model';
import { CasaisService } from '../../services/casais.service';
import { NgxMaskDirective, NgxMaskPipe } from 'ngx-mask';

import { MatStepperModule } from '@angular/material/stepper';

const RELIGIOES = [
  'Adventista do 7º Dia',
  'Evangélica',
  'Espírita',
  'Católica',
  'Outras Denominações',
  'Cristão',
  'Sem Religião'
];

const DIETAS_ALIMENTARES = [
  'não',
  'ovolactovegetariano',
  'vegetariano',
  'vegano'
];

@Component({
  selector: 'app-form-cadastro',
  imports: [NgxMaskDirective,
    MatCardModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatCheckboxModule, MatDatepickerModule, MatNativeDateModule, MatButtonModule, MatIconModule, MatSnackBarModule, MatProgressSpinnerModule, MatStepperModule, FormsModule, ReactiveFormsModule, CommonModule],
  templateUrl: './form-cadastro.html',
  styleUrl: './form-cadastro.scss'
})
export class FormCadastro implements OnInit {

  inscricaoForm!: FormGroup;
  token!: string;
  loading = false;
  submitted = false;
  success = false;
  casal_id!: number;

  religioes = RELIGIOES;
  dietasAlimentares = DIETAS_ALIMENTARES;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private inscricoesService: InscricoesService,
    private snackBar: MatSnackBar,
    private casaisService: CasaisService
  ) { }

  ngOnInit(): void {
    this.inicializarFormulario();

    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.casal_id = +id;
        this.carregarDadosCasal(this.casal_id);
      }
    });
  }

  inicializarFormulario(): void {
    this.inscricaoForm = this.fb.group({
      casal: this.fb.group({
        data_casamento: [''],
        endereco: ['', Validators.required],
        bairro: ['', Validators.required],
        cidade: ['', Validators.required],
        cep: ['', Validators.required],
        contato_emergencia_nome1: [''],
        contato_emergencia_telefone1: [''],
        contato_emergencia_nome2: [''],
        contato_emergencia_telefone2: [''],
        responsavel_filhos_nome: [''],
        responsavel_filhos_telefone: ['']
      }),
      pessoas: this.fb.array([
        this.criarPessoaFormGroup('esposo'),
        this.criarPessoaFormGroup('esposa')
      ]),
      filhos: this.fb.array([])
    });
  }

  criarPessoaFormGroup(tipo: 'esposo' | 'esposa'): FormGroup {
    return this.fb.group({
      tipo: [tipo],
      nome_completo: ['', Validators.required],
      nome_social: [''],
      data_nascimento: [''],
      profissao: [''],
      email: ['', Validators.email],
      celular: [''],
      rg: [''],
      rg_emissor: [''],
      cpf: [''],
      problema_saude: [false],
      problema_saude_descricao: [''],
      medicamento_especial: [false],
      medicamento_especial_descricao: [''],
      diabetico: [false],
      dieta_alimentar: ['não'],
      religiao: ['católica', Validators.required]
    });
  }

  criarFilhoFormGroup(): FormGroup {
    return this.fb.group({
      nome_completo: ['', Validators.required],
      data_nascimento: ['']
    });
  }
  get pessoasFormArray(): FormArray {
    return this.inscricaoForm.get('pessoas') as FormArray;
  }

  get filhosFormArray(): FormArray {
    return this.inscricaoForm.get('filhos') as FormArray;
  }

  get casalFormGroup(): FormGroup {
    return this.inscricaoForm.get('casal') as FormGroup;
  }

  get esposoFormGroup(): FormGroup {
    return this.pessoasFormArray.at(0) as FormGroup;
  }

  get esposaFormGroup(): FormGroup {
    return this.pessoasFormArray.at(1) as FormGroup;
  }

  adicionarFilho(): void {
    this.filhosFormArray.push(this.criarFilhoFormGroup());
  }

  removerFilho(index: number): void {
    this.filhosFormArray.removeAt(index);
  }

  retornar() {
    this.router.navigate(['/lista-incricao']);
  }

  buscarCep(): void {
    const cepField = this.inscricaoForm.get('casal.cep');
    const cep = cepField?.value?.replace(/\D/g, '');
    if (cep && cep.length === 8) {
      fetch(`https://viacep.com.br/ws/${cep}/json/`)
        .then(res => res.json())
        .then(dados => {
          if (dados && !dados.erro) {
            this.inscricaoForm.patchValue({
              casal: {
                endereco: dados.logradouro || '',
                bairro: dados.bairro || '',
                cidade: dados.localidade || ''
              }
            });
            this.snackBar.open('Endereço preenchido automaticamente pelo CEP!', 'Fechar', { duration: 3000 });
          } else {
            this.snackBar.open('CEP não encontrado.', 'Fechar', { duration: 3000 });
          }
        })
        .catch(err => {
          console.error('Erro ao buscar CEP:', err);
          this.snackBar.open('Erro ao buscar o CEP.', 'Fechar', { duration: 3000 });
        });
    }
  }

  onSubmit(): void {
    this.submitted = true;
    if (this.inscricaoForm.invalid) {
      this.mostrarSnackBar('Por favor, corrija os erros no formulário antes de enviar.', 'error');
      return;
    }
    this.loading = true;
    // Clona o valor do formulário
    const registro: RegistroRecord = {
      ...this.inscricaoForm.value,
      token: this.token
    };
    // Converte datas do casal
    if (registro.casal.data_casamento) {
      registro.casal.data_casamento = this.formatarDataParaSalvar(registro.casal.data_casamento);
    }
    // Converte datas das pessoas
    if (Array.isArray(registro.pessoas)) {
      registro.pessoas = registro.pessoas.map(p => ({
        ...p,
        data_nascimento: p.data_nascimento ? this.formatarDataParaSalvar(p.data_nascimento) : ''
      }));
    }
    // Converte datas dos filhos
    if (Array.isArray(registro.filhos)) {
      registro.filhos = registro.filhos.map(f => ({
        ...f,
        data_nascimento: f.data_nascimento ? this.formatarDataParaSalvar(f.data_nascimento) : ''
      }));
    }

    if (this.casal_id) {
      // Atualiza casal existente
      this.casaisService.updateCasal(this.casal_id, registro).subscribe({
        next: () => {
          this.loading = false;
          this.success = true;
          this.mostrarSnackBar('Inscrição registrada com sucesso!', 'success');
        },
        error: () => {
          this.loading = false;
          this.mostrarSnackBar('Erro ao enviar inscrição. Por favor, tente novamente.', 'error');
        }
      });
    }
    else {
      // Cria novo casal
      this.casaisService.createCasal(registro).subscribe({
        next: () => {
          this.loading = false;
          this.success = true;
          this.mostrarSnackBar('Casal registrado com sucesso!', 'success');
          this.router.navigate(['/lista-incricao']);
        },
        error: () => {
          this.loading = false;
          this.mostrarSnackBar('Erro ao enviar Casal. Por favor, tente novamente.', 'error');
        }
      });
    }
  }

  carregarDadosCasal(id: number): void {
    this.loading = true;
    this.casaisService.getCasaisById(id).subscribe({
      next: (registro: Registro) => {
        this.loading = false;
        if (registro) {
          // Converte datas do casal
          if (registro.data_casamento) {
            registro.data_casamento = this.formatarDataParaExibicao(registro.data_casamento);
          }
          // Converte datas das pessoas
          if (Array.isArray(registro.pessoas)) {
            registro.pessoas = registro.pessoas.map(p => ({
              ...p,
              data_nascimento: p.data_nascimento ? this.formatarDataParaExibicao(p.data_nascimento) : ''
            }));
          }
          // Converte datas dos filhos
          if (Array.isArray(registro.filhos)) {
            registro.filhos = registro.filhos.map(f => ({
              ...f,
              data_nascimento: f.data_nascimento ? this.formatarDataParaExibicao(f.data_nascimento) : ''
            }));
          }
          this.inscricaoForm.patchValue({
            casal: registro,
          });
          this.atualizarArraysDinamicos(registro);
        }
      },
      error: () => {
        this.loading = false;
        this.mostrarSnackBar('Erro ao carregar dados do casal.', 'error');
      }
    });
  }

  private atualizarArraysDinamicos(registro: Registro) {
    // Atualiza pessoas
    const pessoasArray = this.inscricaoForm.get('pessoas') as FormArray;
    pessoasArray.clear();
    if (Array.isArray(registro.pessoas)) {
      registro.pessoas.forEach(pessoa => {
        pessoasArray.push(this.fb.group(pessoa));
      });
    }

    // Atualiza filhos
    const filhosArray = this.inscricaoForm.get('filhos') as FormArray;
    filhosArray.clear();
    if (Array.isArray(registro.filhos)) {
      registro.filhos.forEach(filho => {
        filhosArray.push(this.fb.group(filho));
      });
    }
  }

  private mostrarSnackBar(mensagem: string, tipo: 'success' | 'error') {
    this.snackBar.open(mensagem, 'Fechar', {
      duration: 5000,
      panelClass: [`${tipo}-snackbar`]
    });
  }

  private formatarDataParaExibicao(data: string | null): string {
    if (!data) return '';
    const [ano, mes, dia] = data.split('-');
    return `${dia}/${mes}/${ano}`;
  }

  private formatarDataParaSalvar(data: string | null): string {
    if (!data) return '';


    // Se vier no formato ddmmaaaa (ex: 16121997)
    if (/^\d{8}$/.test(data)) {
      const dia = data.substring(0, 2);
      const mes = data.substring(2, 4);
      const ano = data.substring(4, 8);
      return `${ano}-${mes}-${dia}`;
    }
    // Se vier no formato dd/mm/aaaa
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(data)) {
      const [dia, mes, ano] = data.split('/');
      return `${ano}-${mes}-${dia}`;
    }
    // Se já estiver no formato aaaa-mm-dd, retorna como está
    if (/^\d{4}-\d{2}-\d{2}$/.test(data)) {
      return data;
    }
    // Caso contrário, retorna vazio ou trata conforme necessário
    return '';
  }
}
