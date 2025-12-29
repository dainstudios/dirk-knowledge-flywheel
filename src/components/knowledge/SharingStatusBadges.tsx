import { Users, Linkedin, Mail } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface SharingStatusBadgesProps {
  sharedToTeam?: boolean | null;
  sharedToTeamAt?: string | null;
  queuedForLinkedin?: boolean | null;
  queuedForLinkedinAt?: string | null;
  queuedForNewsletter?: boolean | null;
  queuedForNewsletterAt?: string | null;
  className?: string;
}

export function SharingStatusBadges({
  sharedToTeam,
  sharedToTeamAt,
  queuedForLinkedin,
  queuedForLinkedinAt,
  queuedForNewsletter,
  queuedForNewsletterAt,
  className = '',
}: SharingStatusBadgesProps) {
  const hasAnyStatus = sharedToTeam || queuedForLinkedin || queuedForNewsletter;

  if (!hasAnyStatus) return null;

  return (
    <div className={`flex items-center gap-3 flex-wrap ${className}`}>
      {sharedToTeam && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Users className="h-3 w-3" />
          <span>Team</span>
          {sharedToTeamAt && (
            <span className="text-muted-foreground/70">
              {formatDistanceToNow(new Date(sharedToTeamAt), { addSuffix: true })}
            </span>
          )}
        </div>
      )}
      {queuedForLinkedin && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Linkedin className="h-3 w-3" />
          <span>LinkedIn</span>
          {queuedForLinkedinAt && (
            <span className="text-muted-foreground/70">
              {formatDistanceToNow(new Date(queuedForLinkedinAt), { addSuffix: true })}
            </span>
          )}
        </div>
      )}
      {queuedForNewsletter && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Mail className="h-3 w-3" />
          <span>Newsletter</span>
          {queuedForNewsletterAt && (
            <span className="text-muted-foreground/70">
              {formatDistanceToNow(new Date(queuedForNewsletterAt), { addSuffix: true })}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
