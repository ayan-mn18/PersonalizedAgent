import express from 'express';
import { slackRouter } from './slack';
import { jiraRouter } from './jira';
import { gmailRouter } from './gmail';

export const router = express.Router();

router.use('/slack', slackRouter);
router.use('/jira', jiraRouter);
router.use('/gmail', gmailRouter);
