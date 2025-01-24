import { MembershipRole } from 'generated/graphql';
import { WhyLabsSelect } from 'components/design-system';

type RoleSelectProps = {
  role: MembershipRole;
  setRole: (role: MembershipRole) => void;
};

export const RoleSelect: React.FC<RoleSelectProps> = ({ role, setRole }) => {
  return (
    <div style={{ width: 100 }}>
      <WhyLabsSelect
        size="xs"
        value={role}
        withinPortal
        label="role select"
        hideLabel
        data={Object.values(MembershipRole)}
        onChange={(r) => setRole(r as MembershipRole)}
      />
    </div>
  );
};
