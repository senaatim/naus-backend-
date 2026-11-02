const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');

// GET all members (supports pagination, search, and filters with camelCase mapping)
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

        // Map lowercase database rows to camelCase for frontend tables
        const formattedMembers = (members || []).map(m => ({
            ...m,
            id: m.id,
            membershipNumber: m.membershipnumber || m.membershipNumber || '',
            firstName: m.firstname || m.firstName || '',
            middleName: m.middlename || m.middleName || '',
            lastName: m.lastname || m.lastName || '',
            email: m.email || '',
            phoneNumber: m.phonenumber || m.phoneNumber || m.phone || '',
            areaOfSpecialty: m.areaofspecialty || m.areaOfSpecialty || m.specialty || '',
            membershipType: m.membershiptype || m.membershipType || 'new',
            isActive: m.isactive !== undefined ? m.isactive : true,
            profilePhoto: m.profilephoto || m.profilePhoto || '',
            createdAt: m.createdat || m.createdAt || ''
        }));

        const totalPages = Math.ceil((count || 0) / limit);

        return res.json({
            members: formattedMembers,
            totalPages: totalPages > 0 ? totalPages : 1,
            totalMembers: count || 0,
            currentPage: page
        });

    } catch (err) {
        console.error('Members route error:', err);
        return res.status(500).json({ message: 'Internal server error.' });
    }
});

// GET single member by ID (mapped to camelCase)
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { data: m, error } = await supabase
            .from('members')
            .select('*')
            .eq('id', id)
            .maybeSingle();

        if (error || !m) {
            return res.status(404).json({ message: 'Member not found.' });
        }

        const formattedMember = {
            id: m.id,
            membershipNumber: m.membershipnumber || m.membershipNumber || '',
            firstName: m.firstname || m.firstName || '',
            middleName: m.middlename || m.middleName || '',
            lastName: m.lastname || m.lastName || '',
            email: m.email || '',
            phoneNumber: m.phonenumber || m.phoneNumber || m.phone || '',
            areaOfSpecialty: m.areaofspecialty || m.areaOfSpecialty || m.specialty || '',
            streetAddress: m.streetaddress || m.streetAddress || '',
            permanentAddress: m.permanentaddress || m.permanentAddress || '',
            currentPractice: m.currentpractice || m.currentPractice || '',
            nextOfKinName: m.nextofkinname || m.nextOfKinName || '',
            nextOfKinPhone: m.nextofkinphone || m.nextOfKinPhone || '',
            nextOfKinEmail: m.nextofkinemail || m.nextOfKinEmail || '',
            mdcnRegistrationNumber: m.mdcnregistrationnumber || m.mdcnRegistrationNumber || '',
            yearQualifiedMBBS: m.yearqualifiedmbbs || m.yearQualifiedMBBS || '',
            fellowshipCollege: m.fellowshipcollege || m.fellowshipCollege || '',
            fwacs: m.fwacs || false,
            fmcs: m.fmcs || false,
            facs: m.facs || false,
            frcs: m.frcs || false,
            others: m.others || false,
            membershipType: m.membershiptype || m.membershipType || 'new',
            isActive: m.isactive !== undefined ? m.isactive : true,
            profilePhoto: m.profilephoto || m.profilePhoto || '',
            mbbsCertificate: m.mbbscertificate || m.mbbsCertificate || '',
            fellowshipCertificate: m.fellowshipcertificate || m.fellowshipCertificate || '',
            createdAt: m.createdat || m.createdAt || ''
        };

        return res.json({ member: formattedMember });
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
        if (body.firstName !== undefined || body.first_name !== undefined) updateData.firstname = body.firstName || body.first_name;
        if (body.middleName !== undefined || body.middle_name !== undefined) updateData.middlename = body.middleName || body.middle_name;
        if (body.lastName !== undefined || body.last_name !== undefined) updateData.lastname = body.lastName || body.last_name;
        if (body.email !== undefined) updateData.email = body.email;
        if (body.phoneNumber !== undefined || body.phone_number !== undefined) updateData.phonenumber = body.phoneNumber || body.phone_number;
        if (body.areaOfSpecialty !== undefined || body.area_of_specialty !== undefined) updateData.areaofspecialty = body.areaOfSpecialty || body.area_of_specialty;
        if (body.streetAddress !== undefined || body.street_address !== undefined) updateData.streetaddress = body.streetAddress || body.street_address;
        if (body.permanentAddress !== undefined || body.permanent_address !== undefined) updateData.permanentaddress = body.permanentAddress || body.permanent_address;
        if (body.currentPractice !== undefined || body.current_practice !== undefined) updateData.currentpractice = body.currentPractice || body.current_practice;
        if (body.membershipType !== undefined || body.membership_type !== undefined) updateData.membershiptype = body.membershipType || body.membership_type;
        
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