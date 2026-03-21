import type { LucideIcon } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

interface ServiceCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  details: string[];
}

export function ServiceCard({ icon: Icon, title, description, details }: ServiceCardProps) {
  return (
    <Card className="transition-shadow duration-200 hover:shadow-md">
      <CardHeader>
        <div className="mb-2">
          <Icon className="size-12 text-muted-foreground" />
        </div>
        <CardTitle className="text-lg font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-muted-foreground">{description}</p>
        {details.length > 0 && (
          <ul className="space-y-1">
            {details.map((detail) => (
              <li
                key={detail}
                className="text-sm text-muted-foreground flex items-center gap-2"
              >
                <span className="size-1.5 rounded-full bg-primary shrink-0" />
                {detail}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
