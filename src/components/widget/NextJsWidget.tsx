'use client';

import { SiteHelperWidget } from './SiteHelperWidget';

type NextJsWidgetProps = {
  websiteId: string;
  apiUrl: string;
  theme?: 'light' | 'dark';
  primaryColor?: string;
  position?: 'bottom-right' | 'bottom-left';
  greeting?: string;
};

export function NextJsWidget(props: NextJsWidgetProps) {
  return <SiteHelperWidget {...props} />;
}
