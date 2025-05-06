public class OrgInformation {
	public String id;
	public String instance;
	public String edition;
	public Boolean isSandbox;
	public Boolean isTrial;
	public Boolean isMultiCurrency;
	public Boolean isLex;
}

OrgInformation org = new OrgInformation();

Organization o = [
	SELECT Id, InstanceName, IsSandbox, OrganizationType, TrialExpirationDate FROM Organization LIMIT 1
];

User u = [
	SELECT UserPreferencesLightningExperiencePreferred FROM User WHERE Id = :UserInfo.getUserId() LIMIT 1
];

org.id = o.Id;
org.instance = o.InstanceName;
org.edition = o.OrganizationType;
org.isSandbox = o.IsSandbox;
org.isTrial = !o.IsSandbox && o.TrialExpirationDate != null;
org.isMultiCurrency = UserInfo.isMultiCurrencyOrganization();
org.isLex = u.UserPreferencesLightningExperiencePreferred;

System.assert(false, '-_' + JSON.serialize(org) + '_-');
