import express from 'express';
import { slackRouter } from './slack';
import { jiraRouter } from './jira';



export const router = express.Router();

router.use('/slack', slackRouter);
router.use('/jira', jiraRouter);