import React from "react";

type OrgSwitcherProps = {
    currentOrgId: string;
  };
  
  export default function OrgSwitcher({
    currentOrgId,
  }: OrgSwitcherProps) {
    return (
      <div className="text-sm font-medium">
        Org: {currentOrgId}
      </div>
    );
  }
  