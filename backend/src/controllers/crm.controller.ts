import { Request, Response } from 'express';
import prisma from '../utils/prisma';

const ALLOWED_TYPES = ['ORGANIZER', 'COMPANY', 'PARTNER', 'SPONSOR'] as const;

export async function createPublicCrmLead(req: Request, res: Response): Promise<void> {
  try {
    const { name, email, phone, type, source, notes, nextAction } = req.body as {
      name?: string;
      email?: string;
      phone?: string;
      type?: string;
      source?: string;
      notes?: string;
      nextAction?: string;
    };

    const normalizedName = typeof name === 'string' ? name.trim() : '';

    if (!normalizedName) {
      res.status(400).json({ error: 'Nome é obrigatório.' });
      return;
    }

    if (type && !ALLOWED_TYPES.includes(type as (typeof ALLOWED_TYPES)[number])) {
      res.status(400).json({ error: 'Tipo de interesse inválido.' });
      return;
    }

    const lead = await prisma.crmLead.create({
      data: {
        name: normalizedName,
        email: email?.trim() || null,
        phone: phone?.trim() || null,
        type: (type as any) || 'ORGANIZER',
        status: 'NEW',
        source: source?.trim() || 'Public Form',
        notes: notes?.trim() || null,
        nextAction: nextAction?.trim() || null,
      },
    });

    res.status(201).json({
      message: 'Interesse registrado com sucesso.',
      leadId: lead.id,
    });
  } catch (err) {
    console.error('[CRM] Erro ao criar lead público:', err);
    res.status(500).json({ error: 'Erro ao registrar interesse.' });
  }
}
