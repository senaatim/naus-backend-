// GET member profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    // Look up by email from the authenticated Supabase user
    const { data: member, error } = await supabase
      .from('members')
      .select('*')
      .eq('email', req.user.email)
      .maybeSingle();

    if (error || !member) {
      return res.status(404).json({ message: 'Member profile not found' });
    }

    res.json({
      id: member.id || req.user.id,
      membershipNumber: member.membershipnumber,
      email: member.email,
      firstName: member.firstname,
      middleName: member.middlename,
      lastName: member.lastname,
      phoneNumber: member.phonenumber,
      areaOfSpecialty: member.areaofspecialty,
      streetAddress: member.streetaddress,
      permanentAddress: member.permanentaddress,
      mdcnRegistrationNumber: member.mdcnregistrationnumber,
      profilePhoto: member.profilephoto,
      showInDirectory: member.showindirectory,
      isActive: member.isactive,
      joinedDate: member.joineddate,
      mbbsCertificate: member.mbbscertificate,
      fellowshipCertificate: member.fellowshipcertificate,
      membershipType: member.membershiptype
    });

  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ message: 'Error fetching profile', error: error.message });
  }
});