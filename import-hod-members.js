// Check if email is missing or empty
      if (!member.email || member.email.trim() === '') {
        console.log(`⚠️ Missing email for ${member.membershipNumber} (${member.firstName} ${member.lastName}). Saving profile only...`);
        
        // Insert into members table without creating a Supabase Auth user
        const { error: dbError } = await supabase
          .from('members')
          .insert([
            {
              // Note: No 'id' here since there is no Supabase Auth user yet
              membershipnumber: member.membershipNumber,
              firstname: member.firstName,
              lastname: member.lastName,
              email: null, // or leave blank
              membershiptype: 'existing',
              hasaccount: false,
              isactive: false
            }
          ]);

        if (dbError) {
          console.error(`❌ DB error for ${member.membershipNumber}:`, dbError.message);
        }
        
        failCount++;
        return; // Move on to the next member
      }