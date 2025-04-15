import express from 'express';
import { protect } from '../controllers/authControllers'; // assuming you have auth middleware
import { createRegistrationRequest, getAllRegistrationRequests, getMyRegistrations, getRegistrationById, updateRegistrationRequest } from '../controllers/registrationController';

const router = express.Router();

// Create registration request
router.post('/', protect, createRegistrationRequest);

// Get my registration requests (with optional ?status=pending|approved|rejected|completed)
router.get('/my', protect, getMyRegistrations);

router.get('/:id',protect,getRegistrationById);

router.patch("/admin/:id",protect,updateRegistrationRequest)
router.get("/admin/registrations-all",protect,getAllRegistrationRequests)

export default router;