const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');

// GET all members (supports pagination, search, and filters for the admin panel)
router.get('/', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search || '';
        const specialty = req.query.specialty || '';
        const status = req.query.status || '';
        const membershipType = req.query.membershipType || '';

        const offset = (page - 1) * limit;

        let query = supabase
            .from('members')
            .select('*', { count: 'exact' });

        // Search filter matching lowercase Supabase columns
        if (search) {
            query = query.or(`firstname.ilike.%${search}%,lastname.ilike.%${search}%,email.ilike.%${search}%,membershipnumber.ilike.%${search}%`);
        }

        // Specialty filter
        if (specialty) {
            query = query.ilike('areaofspecialty', `%${specialty}%`);
        }

        // Membership Type filter
        if (membershipType) {
            query = query.eq('membershiptype', membershipType);
        }

        // Status filter
        if (status) {
            const isActive = status === 'active';
            query = query.eq('isactive', isActive);
        }

        query = query
            .order('createdat', { ascending: false })
            .range(offset, offset + limit - 1);

        const { data: members, count, error } = await query;

        if (error) {
            console.error('Error fetching members list:', error);
            return res.status(500).json({ message: 'Failed to retrieve members.' });
        }

        const totalPages = Math.ceil((count || 0) / limit);

        return res.json({
            members: members || [],
            totalPages: totalPages > 0 ? totalPages : 1,
            totalMembers: count || 0,
            currentPage: page
        });

    } catch (err) {
        console.error('Members route error:', err);
        return res.status(500).json({ message: 'Internal server error.' });
    }
});

// GET single member by ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { data: member, error } = await supabase
            .from('members')
            .select('*')
            .eq('id', id)
            .maybeSingle();

        if (error || !member) {
            return res.status(404).json({ message: 'Member not found.' });
        }

        return res.json({ member });
    } catch (err) {
        console.error('Get member by ID error:', err);
        return res.status(500).json({ message: 'Internal server error.' });
    }
});

// PUT update member details (Admin panel)
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const body = req.body;

        const updateData = {};
        if (body.firstName || body.first_name) updateData.firstname = body.firstName || body.first_name;
        if (body.middleName || body.middle_name) updateData.middlename = body.middleName || body.middle_name;
        if (body.lastName || body.last_name) updateData.lastname = body.lastName || body.last_name;
        if (body.email) updateData.email = body.email;
        if (body.phoneNumber || body.phone_number) updateData.phonenumber = body.phoneNumber || body.phone_number;
        if (body.areaOfSpecialty || body.area_of_specialty) updateData.areaofspecialty = body.areaOfSpecialty || body.area_of_specialty;
        if (body.streetAddress || body.street_address) updateData.streetaddress = body.streetAddress || body.street_address;
        if (body.permanentAddress || body.permanent_address) updateData.permanentaddress = body.permanentAddress || body.permanent_address;
        if (body.currentPractice || body.current_practice) updateData.currentpractice = body.currentPractice || body.current_practice;
        if (body.membershipType || body.membership_type) updateData.membershiptype = body.membershipType || body.membership_type;
        
        updateData.updatedat = new Date();

        const { data, error } = await supabase
            .from('members')
            .update(updateData)
            .eq('id', id)
            .select()
            .maybeSingle();

        if (error) throw error;

        return res.json({ message: 'Member updated successfully', member: data });
    } catch (err) {
        console.error('Update member error:', err);
        return res.status(500).json({ message: 'Failed to update member.', error: err.message });
    }
});

// DELETE member (Admin panel)
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { error } = await supabase
            .from('members')
            .delete()
            .eq('id', id);

        if (error) throw error;

        return res.json({ message: 'Member deleted successfully' });
    } catch (err) {
        console.error('Delete member error:', err);
        return res.status(500).json({ message: 'Failed to delete member.', error: err.message });
    }
});

module.exports = router;