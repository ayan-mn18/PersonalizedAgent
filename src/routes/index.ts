import express from 'express';
import { slackRouter } from './slack';



export const router = express.Router();

router.use('/slack', slackRouter);