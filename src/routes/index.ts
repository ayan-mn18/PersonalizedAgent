import express from 'express';
import { slackRouter } from './slack';
import { jiraRouter } from './jira';
import { gmailRouter } from './gmail';
import { googleCalendarRouter } from './cal';


export const router = express.Router();

router.use('/slack', slackRouter);
router.use('/jira', jiraRouter);
router.use('/gmail', gmailRouter);
router.use('/cal', googleCalendarRouter);
