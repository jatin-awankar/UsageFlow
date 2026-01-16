import React from "react";

type OrgSwitcherProps = {
    currentOrg: string;
  };
  
  export default function OrgSwitcher({
    currentOrg,
  }: OrgSwitcherProps) {
    return (
      <div className="text-sm font-medium">
        Org: {currentOrg}
      </div>
    );
  }
  