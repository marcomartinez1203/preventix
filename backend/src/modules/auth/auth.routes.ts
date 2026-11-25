import { Router } from 'express';
import * as authController from './auth.controller';
import { authenticate } from '../../middlewares/auth.middleware';
import { contract } from '../../legal/contract';
import { acceptTerms } from './auth.service';

const router = Router();

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/refresh', authController.refresh);
router.post('/logout', authenticate, authController.logout);
router.get('/me', authenticate, authController.me);
router.get('/terms', authenticate, (req, res) => {
  res.json({ data: { ...contract, accepted: req.user?.termsVersion === contract.version } });
});
router.post('/terms/accept', authenticate, async (req, res, next) => {
  try {
    if (req.body?.accepted !== true || req.body?.version !== contract.version) { res.status(400).json({ message: 'Acepta expresamente la versión actual del contrato.' }); return; }
    const result = await acceptTerms(req.user!.userId, req.user!.sid!);
    res.cookie('refreshToken', result.refreshToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', maxAge: 7 * 24 * 60 * 60 * 1000 });
    res.json({ data: { accepted: true, version: contract.version, acceptedAt: result.acceptedAt, accessToken: result.accessToken } });
  } catch (error) { next(error); }
});

export default router;
