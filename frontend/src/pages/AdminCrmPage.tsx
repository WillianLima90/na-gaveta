import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { ArrowLeft, Loader2, Plus, RefreshCw, Save, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

type LeadType = 'ORGANIZER' | 'COMPANY' | 'PARTNER' | 'SPONSOR';
type LeadStatus = 'NEW' | 'CONTACTED' | 'PROPOSAL_SENT' | 'WON' | 'LOST';

interface CrmLead {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  type: LeadType;
  status: LeadStatus;
  source?: string | null;
  notes?: string | null;
  nextAction?: string | null;
  createdAt: string;
  updatedAt: string;
}

const typeLabels: Record<LeadType, string> = {
  ORGANIZER: 'Organizador',
  COMPANY: 'Empresa',
  PARTNER: 'Parceiro',
  SPONSOR: 'Patrocinador',
};

const statusLabels: Record<LeadStatus, string> = {
  NEW: 'Novo',
  CONTACTED: 'Contatado',
  PROPOSAL_SENT: 'Proposta enviada',
  WON: 'Fechado',
  LOST: 'Perdido',
};

export function AdminCrmPage() {
  const navigate = useNavigate();
  const { token, user } = useAuth();

  const [leads, setLeads] = useState<CrmLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | LeadStatus>('ALL');
  const [editingLeadId, setEditingLeadId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    phone: '',
    email: '',
    type: 'ORGANIZER' as LeadType,
    status: 'NEW' as LeadStatus,
    source: '',
    nextAction: '',
    notes: '',
  });

  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    type: 'ORGANIZER' as LeadType,
    status: 'NEW' as LeadStatus,
    source: '',
    nextAction: '',
    notes: '',
  });

  async function loadLeads() {
    try {
      setError('');
      setLoading(true);
      const res = await axios.get('/api/admin/crm/leads', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setLeads(res.data.leads);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Erro ao carregar CRM.');
    } finally {
      setLoading(false);
    }
  }

  async function createLead() {
    if (!form.name.trim()) {
      setError('Informe o nome do lead.');
      return;
    }

    try {
      setSaving(true);
      setError('');
      setMessage('');

      const res = await axios.post(
        '/api/admin/crm/leads',
        form,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setLeads((current) => [res.data.lead, ...current]);
      setForm({
        name: '',
        phone: '',
        email: '',
        type: 'ORGANIZER',
        status: 'NEW',
        source: '',
        nextAction: '',
        notes: '',
      });
      setMessage('Lead criado com sucesso.');
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Erro ao criar lead.');
    } finally {
      setSaving(false);
    }
  }

  async function updateLeadStatus(lead: CrmLead, status: LeadStatus) {
    try {
      setError('');
      const res = await axios.patch(
        `/api/admin/crm/leads/${lead.id}`,
        { status },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setLeads((current) => current.map((item) => item.id === lead.id ? res.data.lead : item));
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Erro ao atualizar lead.');
    }
  }

  function startEditingLead(lead: CrmLead) {
    setError('');
    setMessage('');
    setEditingLeadId(lead.id);
    setEditForm({
      name: lead.name || '',
      phone: lead.phone || '',
      email: lead.email || '',
      type: lead.type,
      status: lead.status,
      source: lead.source || '',
      nextAction: lead.nextAction || '',
      notes: lead.notes || '',
    });
  }

  function cancelEditingLead() {
    setEditingLeadId(null);
    setError('');
  }

  async function saveEditingLead(lead: CrmLead) {
    if (!editForm.name.trim()) {
      setError('Informe o nome do lead.');
      return;
    }

    try {
      setSaving(true);
      setError('');
      setMessage('');

      const res = await axios.patch(
        `/api/admin/crm/leads/${lead.id}`,
        editForm,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setLeads((current) => current.map((item) => item.id === lead.id ? res.data.lead : item));
      setEditingLeadId(null);
      setMessage('Lead atualizado com sucesso.');
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Erro ao atualizar lead.');
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    if (user?.role !== 'ADMIN') {
      navigate('/dashboard');
      return;
    }

    loadLeads();
  }, [user?.role]);

  const filteredLeads = useMemo(() => {
    if (statusFilter === 'ALL') return leads;
    return leads.filter((lead) => lead.status === statusFilter);
  }, [leads, statusFilter]);

  const summary = useMemo(() => {
    return leads.reduce(
      (acc, lead) => {
        acc.total += 1;
        acc[lead.status] += 1;
        return acc;
      },
      { total: 0, NEW: 0, CONTACTED: 0, PROPOSAL_SENT: 0, WON: 0, LOST: 0 } as Record<LeadStatus | 'total', number>
    );
  }, [leads]);

  return (
    <div className="min-h-screen bg-zinc-950 px-4 py-6 text-white">
      <div className="mx-auto max-w-7xl">
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-zinc-400 transition hover:text-white"
        >
          <ArrowLeft size={16} />
          Voltar
        </button>

        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight">Admin — CRM</h1>
            <p className="mt-1 text-sm text-zinc-400">
              Controle leads, parceiros, patrocinadores e oportunidades PRO/BUSINESS.
            </p>
          </div>

          <button
            type="button"
            onClick={loadLeads}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-700 px-4 py-2 text-sm font-bold text-zinc-200 transition hover:bg-zinc-800"
          >
            <RefreshCw size={15} />
            Atualizar
          </button>
        </div>

        {(message || error) && (
          <div className={`mb-4 rounded-xl border px-4 py-3 text-sm font-bold ${
            error ? 'border-red-500/30 bg-red-500/10 text-red-300' : 'border-green-500/30 bg-green-500/10 text-green-300'
          }`}>
            {error || message}
          </div>
        )}

        <div className="mb-5 grid gap-3 md:grid-cols-6">
          <button
            type="button"
            onClick={() => setStatusFilter('ALL')}
            className={`rounded-2xl border p-4 text-left transition ${
              statusFilter === 'ALL' ? 'border-brand bg-brand/10' : 'border-zinc-800 bg-zinc-900/70 hover:bg-zinc-800/80'
            }`}
          >
            <p className="text-xs font-bold text-zinc-500">Total</p>
            <p className="mt-1 text-2xl font-black">{summary.total}</p>
          </button>
          {(['NEW', 'CONTACTED', 'PROPOSAL_SENT', 'WON', 'LOST'] as LeadStatus[]).map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setStatusFilter(statusFilter === status ? 'ALL' : status)}
              className={`rounded-2xl border p-4 text-left transition ${
                statusFilter === status ? 'border-brand bg-brand/10' : 'border-zinc-800 bg-zinc-900/70 hover:bg-zinc-800/80'
              }`}
            >
              <p className="text-xs font-bold text-zinc-500">{statusLabels[status]}</p>
              <p className="mt-1 text-2xl font-black">{summary[status]}</p>
            </button>
          ))}
        </div>

        <div className="grid gap-5 lg:grid-cols-[380px_1fr]">
          <div className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5">
            <h2 className="text-lg font-black">Novo lead</h2>
            <p className="mt-1 text-xs text-zinc-500">Cadastre contatos comerciais para vender PRO, BUSINESS, parcerias e patrocínios.</p>

            <div className="mt-5 space-y-3">
              <input className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-brand/60" placeholder="Nome *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <input className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-brand/60" placeholder="WhatsApp" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              <input className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-brand/60" placeholder="E-mail" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />

              <div className="grid grid-cols-2 gap-3">
                <select className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-brand/60" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as LeadType })}>
                  {Object.entries(typeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
                <select className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-brand/60" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as LeadStatus })}>
                  {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </div>

              <input className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-brand/60" placeholder="Origem: indicação, Instagram, WhatsApp..." value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} />
              <input className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-brand/60" placeholder="Próxima ação" value={form.nextAction} onChange={(e) => setForm({ ...form, nextAction: e.target.value })} />
              <textarea className="min-h-[110px] w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-brand/60" placeholder="Observações" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />

              <button
                type="button"
                onClick={createLead}
                disabled={saving}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 text-sm font-black text-black transition hover:opacity-90 disabled:opacity-60"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                {saving ? 'Salvando...' : 'Criar lead'}
              </button>
            </div>
          </div>

          <div className="rounded-3xl border border-zinc-800 bg-zinc-900/70 overflow-hidden">
            <div className="border-b border-zinc-800 px-5 py-4">
              <h2 className="text-lg font-black">Leads</h2>
              <p className="mt-1 text-xs text-zinc-500">{filteredLeads.length} lead(s) exibido(s)</p>
            </div>

            {loading ? (
              <div className="flex justify-center py-10"><Loader2 className="animate-spin text-zinc-500" /></div>
            ) : filteredLeads.length === 0 ? (
              <div className="px-5 py-10 text-sm text-zinc-500">Nenhum lead encontrado.</div>
            ) : (
              <div className="divide-y divide-zinc-800">
                {filteredLeads.map((lead) => {
                  const isEditing = editingLeadId === lead.id;

                  return (
                    <div key={lead.id} className="p-5">
                      {isEditing ? (
                        <div className="space-y-3 rounded-2xl border border-brand/30 bg-zinc-950/70 p-4">
                          <div className="grid gap-3 md:grid-cols-2">
                            <input className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-brand/60" placeholder="Nome *" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
                            <input className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-brand/60" placeholder="WhatsApp" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
                            <input className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-brand/60" placeholder="E-mail" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
                            <input className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-brand/60" placeholder="Origem" value={editForm.source} onChange={(e) => setEditForm({ ...editForm, source: e.target.value })} />

                            <select className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-brand/60" value={editForm.type} onChange={(e) => setEditForm({ ...editForm, type: e.target.value as LeadType })}>
                              {Object.entries(typeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                            </select>
                            <select className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-brand/60" value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value as LeadStatus })}>
                              {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                            </select>
                          </div>

                          <label className="block">
                            <span className="mb-1 block text-xs font-black uppercase tracking-[0.16em] text-zinc-500">Próxima ação</span>
                            <input className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-brand/60" placeholder="Ex.: Ligar amanhã às 15h" value={editForm.nextAction} onChange={(e) => setEditForm({ ...editForm, nextAction: e.target.value })} />
                          </label>

                          <label className="block">
                            <span className="mb-1 block text-xs font-black uppercase tracking-[0.16em] text-zinc-500">Observações internas</span>
                            <textarea className="min-h-[120px] w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-brand/60" placeholder="Notas comerciais, contexto, objeções, próximos passos..." value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} />
                          </label>

                          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                            <button type="button" onClick={cancelEditingLead} className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-700 px-4 py-2 text-sm font-bold text-zinc-300 hover:bg-zinc-800">
                              <X size={15} />
                              Cancelar
                            </button>
                            <button type="button" onClick={() => saveEditingLead(lead)} disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-4 py-2 text-sm font-black text-black hover:opacity-90 disabled:opacity-60">
                              {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                              Salvar alterações
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="font-black">{lead.name}</h3>
                              <span className="rounded-full border border-zinc-700 bg-zinc-800 px-2 py-0.5 text-[11px] font-bold text-zinc-300">{typeLabels[lead.type]}</span>
                              <span className="rounded-full border border-brand/30 bg-brand/10 px-2 py-0.5 text-[11px] font-bold text-brand">{statusLabels[lead.status]}</span>
                            </div>
                            <div className="mt-2 space-y-1 text-xs text-zinc-400">
                              {lead.phone && <p>WhatsApp: {lead.phone}</p>}
                              {lead.email && <p>E-mail: {lead.email}</p>}
                              {lead.source && <p>Origem: {lead.source}</p>}
                              {lead.nextAction && <p>Próxima ação: {lead.nextAction}</p>}
                              {lead.notes && <p className="whitespace-pre-line text-zinc-300">Obs: {lead.notes}</p>}
                            </div>
                          </div>

                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                            <button
                              type="button"
                              onClick={() => startEditingLead(lead)}
                              className="rounded-xl border border-zinc-700 px-3 py-2 text-xs font-bold text-zinc-200 transition hover:bg-zinc-800"
                            >
                              Editar
                            </button>

                            <select
                              value={lead.status}
                              onChange={(e) => updateLeadStatus(lead, e.target.value as LeadStatus)}
                              className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs font-bold text-zinc-200 outline-none focus:border-brand/60"
                            >
                              {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                            </select>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
