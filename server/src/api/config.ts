import { Router } from 'express';
import { HEROES, ITEMS, BAZAAR_ITEMS, MONSTERS, EVENTS } from '../game/config/index.js';

const router = Router();

router.get('/heroes', (_req, res) => res.json(HEROES));
router.get('/items', (_req, res) => res.json(ITEMS));
router.get('/bazaar-items', (_req, res) => res.json(BAZAAR_ITEMS));
router.get('/monsters', (_req, res) => res.json(MONSTERS));
router.get('/events', (_req, res) => res.json(EVENTS));

export { router as configRouter };
