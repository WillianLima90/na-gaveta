import { Response } from 'express';
import { AuthRequest } from '../types';
import prisma from '../utils/prisma';

const ALLOWED_TYPES = ['ORGANIZER', 'COMPANY', 'PARTNER', 'SPONSOR'] as const;
const ALLOWED_STATUSES = ['NEW', 'CONTACTED', 'PROPOSAL_SENT', 'WON', 'LOST'] as const;

function ensureAdmin(req: AuthRequest, res: Response): boolean {
  if (!req.user || req.user.role !== 'ADMIN') {
    res.status(403).json({ error: 'Apenas ADMIN pode acessar o CRM.' });
    return false;
  }

  return true;
}

export async function listCrmLeads(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!ensureAdmin(req, res)) return;

    const leads = await prisma.crmLead.findMany({
      orderBy: { createdAt: 'desc' },
    });

    res.json({ leads });
  } catch (err) {
    console.error('[AdminCRM] Erro ao listar leads:', err);
    res.status(500).json({ error: 'Erro ao buscar leads do CRM.' });
  }
}

export async function createCrmLead(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!ensureAdmin(req, res)) return;

    const { name, email, phone, type, status, source, notes, nextAction } = req.body as {
      name?: string;
      email?: string;
      phone?: string;
      type?: string;
      status?: string;
      source?: string;
      notes?: string;
      nextAction?: string;
    };

    const normalizedName = typeof name === 'string' ? name.trim() : '';

    if (!normalizedName) {
      res.status(400).json({ error: 'Nome do lead é obrigatório.' });
      return;
    }

    if (type && !ALLOWED_TYPES.includes(type as (typeof ALLOWED_TYPES)[number])) {
      res.status(400).json({ error: 'Tipo de lead inválido.' });
      return;
    }

    if (status && !ALLOWED_STATUSES.includes(status as (typeof ALLOWED_STATUSES)[number])) {
      res.status(400).json({ error: 'Status de lead inválido.' });
      return;
    }

    const lead = await prisma.crmLead.create({
      data: {
        name: normalizedName,
        email: email?.trim() || null,
        phone: phone?.trim() || null,
        type: (type as any) || 'ORGANIZER',
        status: (status as any) || 'NEW',
        source: source?.trim() || null,
        notes: notes?.trim() || null,
        nextAction: nextAction?.trim() || null,
      },
    });

    res.status(201).json({ lead });
  } catch (err) {
    console.error('[AdminCRM] Erro ao criar lead:', err);
    res.status(500).json({ error: 'Erro ao criar lead no CRM.' });
  }
}

export async function updateCrmLead(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!ensureAdmin(req, res)) return;

    const { id } = req.params;
    const { name, email, phone, type, status, source, notes, nextAction } = req.body as {
      name?: string;
      email?: string | null;
      phone?: string | null;
      type?: string;
      status?: string;
      source?: string | null;
      notes?: string | null;
      nextAction?: string | null;
    };

    const existing = await prisma.crmLead.findUnique({ where: { id } });

    if (!existing) {
      res.status(404).json({ error: 'Lead não encontrado.' });
      return;
    }

    if (type && !ALLOWED_TYPES.includes(type as (typeof ALLOWED_TYPES)[number])) {
      res.status(400).json({ error: 'Tipo de lead inválido.' });
      return;
    }

    if (status && !ALLOWED_STATUSES.includes(status as (typeof ALLOWED_STATUSES)[number])) {
      res.status(400).json({ error: 'Status de lead inválido.' });
      return;
    }

    const lead = await prisma.crmLead.update({
      where: { id },
      data: {
        ...(typeof name === 'string' ? { name: name.trim() } : {}),
        ...(email !== undefined ? { email: email?.trim() || null } : {}),
        ...(phone !== undefined ? { phone: phone?.trim() || null } : {}),
        ...(type ? { type: type as any } : {}),
        ...(status ? { status: status as any } : {}),
        ...(source !== undefined ? { source: source?.trim() || null } : {}),
        ...(notes !== undefined ? { notes: notes?.trim() || null } : {}),
        ...(nextAction !== undefined ? { nextAction: nextAction?.trim() || null } : {}),
      },
    });

    res.json({ lead });
  } catch (err) {
    console.error('[AdminCRM] Erro ao atualizar lead:', err);
    res.status(500).json({ error: 'Erro ao atualizar lead do CRM.' });
  }
}
