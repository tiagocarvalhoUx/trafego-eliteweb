import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';

export function validate(schema: Joi.ObjectSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error } = schema.validate(req.body, { abortEarly: false });

    if (error) {
      const messages = error.details.map((d) => d.message);
      res.status(422).json({ success: false, message: 'Dados inválidos', errors: messages });
      return;
    }

    next();
  };
}

// Validation schemas
export const schemas = {
  register: Joi.object({
    nome: Joi.string().min(2).max(100).required().messages({
      'string.min': 'Nome deve ter no mínimo 2 caracteres',
      'any.required': 'Nome é obrigatório',
    }),
    email: Joi.string().email().required().messages({
      'string.email': 'Email inválido',
      'any.required': 'Email é obrigatório',
    }),
    senha: Joi.string().min(6).required().messages({
      'string.min': 'Senha deve ter no mínimo 6 caracteres',
      'any.required': 'Senha é obrigatória',
    }),
  }),

  login: Joi.object({
    email: Joi.string().email().required(),
    senha: Joi.string().required(),
  }),

  createLead: Joi.object({
    nome: Joi.string().max(100).optional(),
    usuario_plataforma: Joi.string().required(),
    plataforma: Joi.string().valid('instagram', 'tiktok').required(),
    origem: Joi.string().max(200).optional(),
    palavra_chave: Joi.string().max(100).optional(),
  }),

  updateLeadStatus: Joi.object({
    status: Joi.string()
      .valid('novo', 'contatado', 'respondeu', 'convertido', 'descartado')
      .required(),
  }),

  createAutomation: Joi.object({
    conta_id: Joi.number().required(),
    nome: Joi.string().min(2).max(100).required(),
    tipo: Joi.string().valid('comentario_keyword', 'dm_automatica', 'follow_back').required(),
    palavra_chave: Joi.string().max(100).optional(),
    mensagem_resposta: Joi.string().max(1000).optional(),
  }),

  createMeta: Joi.object({
    conta_id: Joi.number().required(),
    tipo: Joi.string().valid('seguidores', 'engajamento', 'leads').required(),
    valor_meta: Joi.number().integer().min(1).required(),
    periodo: Joi.string().valid('semanal', 'mensal').required(),
    data_inicio: Joi.string().isoDate().required(),
    data_fim: Joi.string().isoDate().required(),
  }),
};
