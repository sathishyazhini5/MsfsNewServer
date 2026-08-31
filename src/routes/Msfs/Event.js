import express from 'express';
import { deleteEventById, getAllEvents, getEventById, saveEvent, updateEvent,sendEventMail } from '../../controllers/Msfs/Event_Dlt.js'
import { authenticate } from '../../middlewares/authenticate.js';


const router = express.Router();
router.post('/saveevent',authenticate,saveEvent)
router.post('/sendEventMail',sendEventMail)
router.get('/getEvents',getEventById)
router.get('/getallEvent',getAllEvents)
router.put('/updateEvents', authenticate, updateEvent)
router.delete('/deleteEvents',deleteEventById)

export const eventRouter = router;
