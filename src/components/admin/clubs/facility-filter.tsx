'use client';

import { useRouter } from 'next/navigation';
import { Building2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface FacilityOption {
  id: string;
  name: string;
}

interface FacilityFilterProps {
  facilities: FacilityOption[];
  selectedFacilityId?: string;
  page?: number;
}

/**
 * Facility filter dropdown for club list.
 *
 * URL-based filtering - selecting a facility navigates to ?facilityId=xxx.
 * "All Facilities" navigates to /admin/clubs (no param).
 */
export function FacilityFilter({
  facilities,
  selectedFacilityId,
  page = 1,
}: FacilityFilterProps) {
  const router = useRouter();

  const handleFacilityChange = (value: string) => {
    if (value === 'all') {
      // Navigate to clubs without filter
      router.push('/admin/clubs');
    } else {
      // Navigate with facility filter (reset to page 1 when filter changes)
      router.push(`/admin/clubs?facilityId=${value}`);
    }
  };

  return (
    <Select
      value={selectedFacilityId || 'all'}
      onValueChange={handleFacilityChange}
    >
      <SelectTrigger className="w-[240px]">
        <Building2 className="h-4 w-4 text-[var(--text-muted)]" />
        <SelectValue placeholder="Filter by facility" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All Facilities</SelectItem>
        {facilities.map((facility) => (
          <SelectItem key={facility.id} value={facility.id}>
            {facility.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
