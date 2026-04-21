import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Search, Shield, UserCog, UserCheck, UserX, Loader2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
}

function roleBadge(role: string) {
  if (role === 'ADMIN') {
    return 'bg-red-500/10 text-red-300 border border-red-500/20';
  }
  if (role === 'POOL_ADMIN') {
    return 'bg-amber-500/10 text-amber-300 border border-amber-500/20';
  }
  return 'bg-zinc-800 text-zinc-300 border border-zinc-700';
}

function statusBadge(isActive: boolean) {
  return isActive
    ? 'bg-green-500/10 text-green-300 border border-green-500/20'
    : 'bg-zinc-800 text-zinc-400 border border-zinc-700';
}

export function AdminUsersPage() {
  const navigate = useNavigate();
  const { token } = useAuth();

  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [syncLoading, setSyncLoading] = useState(false);

  const currentUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('ng_user') || 'null');
    } catch {
      return null;
    }
  }, []);

  async function loadUsers() {
    try {
      setError('');
      const res = await axios.get('/api/admin/users', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers(res.data.users);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Erro ao carregar usuários.');
    }
  }

  async function toggleActive(user: User) {
    const action = user.isActive ? 'desativar' : 'ativar';

    if (currentUser?.id === user.id) {
      setError('Você não pode alterar o próprio status por aqui.');
      return;
    }

    const confirmed = window.confirm(`Tem certeza que deseja ${action} ${user.name}?`);
    if (!confirmed) return;

    try {
      setSavingId(user.id);
      setError('');
      setMessage('');

      await axios.patch(
        `/api/admin/users/${user.id}/active`,
        { isActive: !user.isActive },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setMessage(`Usuário ${user.isActive ? 'desativado' : 'ativado'} com sucesso.`);
      await loadUsers();
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Erro ao atualizar status do usuário.');
    } finally {
      setSavingId(null);
    }
  }

  async function runSync() {
    try {
      setSyncLoading(true)
      setError('')
      setMessage('')

      const res = await axios.post('/api/admin/sync-results', {}, {
        headers: { Authorization: `Bearer ${token}` }
      })

      setMessage(`Sync concluído: ${res.data.summary.updated} atualizado(s)`)
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Erro no sync')
    } finally {
      setSyncLoading(false)
    }
  }

  async function changeRole(user: User, role: string) {
    if (role === user.role) return;

    if (currentUser?.id === user.id && role !== 'ADMIN') {
      setError('Você não pode remover sua própria permissão de ADMIN por aqui.');
      return;
    }

    try {
      setSavingId(user.id);
      setError('');
      setMessage('');

      await axios.patch(
        `/api/admin/users/${user.id}/role`,
        { role },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setMessage('Permissão atualizada com sucesso.');
      await loadUsers();
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Erro ao atualizar permissão.');
    } finally {
      setSavingId(null);
    }
  }

  useEffect(() => {
    if (!currentUser || currentUser.role !== 'ADMIN') {
      navigate('/dashboard');
      return;
    }
    loadUsers();
  }, []);

  const filtered = users.filter((u) =>
    `${u.name} ${u.email}`.toLowerCase().includes(search.toLowerCase())
  );

  const activeCount = users.filter((u) => u.isActive).length;

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-2xl bg-brand/15 border border-brand/20 flex items-center justify-center">
              <UserCog size={18} className="text-brand" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight">Admin — Usuários</h1>
              <p className="text-sm text-zinc-400">
                Gerencie acessos, permissões e status dos usuários da plataforma.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between flex-wrap gap-3 mt-4">
            <div className="flex gap-3 flex-wrap">
              <div className="px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-zinc-300">
                <span className="font-bold text-white">{users.length}</span> usuários
              </div>
              <div className="px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-zinc-300">
                <span className="font-bold text-green-300">{activeCount}</span> ativos
              </div>
            </div>

            <button
              onClick={runSync}
              disabled={syncLoading}
              className="h-10 px-4 rounded-xl text-sm font-semibold bg-brand hover:bg-brand/80 transition-colors disabled:opacity-50"
            >
              {syncLoading ? 'Sincronizando...' : 'Sincronizar Resultados'}
            </button>
          </div>
        </div>

        <div className="mb-5 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            placeholder="Buscar por nome ou email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-12 pl-10 pr-4 rounded-2xl bg-zinc-900 border border-zinc-800 text-white placeholder:text-zinc-500 focus:outline-none focus:border-zinc-600"
          />
        </div>

        {message && (
          <div className="mb-4 rounded-xl border border-green-500/20 bg-green-500/10 px-4 py-3 text-sm text-green-300">
            {message}
          </div>
        )}

        {error && (
          <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <div className="space-y-3">
          {filtered.map((user) => {
            const isSaving = savingId === user.id;
            const isSelf = currentUser?.id === user.id;

            return (
              <div
                key={user.id}
                className="rounded-2xl border border-zinc-800 bg-zinc-900/80 px-4 py-4 shadow-sm"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <p className="text-xl font-bold text-white">{user.name}</p>

                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${roleBadge(user.role)}`}>
                        {user.role === 'ADMIN' ? <Shield size={12} /> : <UserCheck size={12} />}
                        {user.role}
                      </span>

                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${statusBadge(user.isActive)}`}>
                        {user.isActive ? <UserCheck size={12} /> : <UserX size={12} />}
                        {user.isActive ? 'ATIVO' : 'INATIVO'}
                      </span>

                      {isSelf && (
                        <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold bg-brand/15 text-brand border border-brand/20">
                          Você
                        </span>
                      )}
                    </div>

                    <p className="text-sm text-zinc-400 break-all">{user.email}</p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                    <select
                      value={user.role}
                      disabled={isSaving}
                      onChange={(e) => changeRole(user, e.target.value)}
                      className="h-10 min-w-[150px] rounded-xl bg-zinc-800 border border-zinc-700 px-3 text-sm text-white focus:outline-none focus:border-zinc-500 disabled:opacity-60"
                    >
                      <option value="USER">USER</option>
                      <option value="POOL_ADMIN">POOL_ADMIN</option>
                      <option value="ADMIN">ADMIN</option>
                    </select>

                    <button
                      onClick={() => toggleActive(user)}
                      disabled={isSaving || isSelf}
                      className={`h-10 px-4 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                        user.isActive
                          ? 'bg-red-600 hover:bg-red-500 text-white'
                          : 'bg-green-600 hover:bg-green-500 text-white'
                      }`}
                    >
                      {isSaving ? (
                        <span className="inline-flex items-center gap-2">
                          <Loader2 size={14} className="animate-spin" />
                          Salvando...
                        </span>
                      ) : user.isActive ? (
                        'Desativar'
                      ) : (
                        'Ativar'
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {filtered.length === 0 && (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-10 text-center text-zinc-500">
              Nenhum usuário encontrado para essa busca.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
