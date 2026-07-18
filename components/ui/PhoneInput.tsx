'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

// ─── Country data ─────────────────────────────────────────────────────────────
// Each entry: [dialCode, iso2, name, flag emoji, min digits, max digits]
// Digit counts refer to the subscriber number AFTER the country code.
// Sources: ITU-T E.164 / libphonenumber metadata (simplified).
export type Country = {
  dialCode: string
  iso2: string
  name: string
  flag: string
  minLength: number
  maxLength: number
}

export const COUNTRIES: Country[] = [
  { dialCode: '+93',  iso2: 'AF', name: 'Afghanistan',           flag: '🇦🇫', minLength: 9,  maxLength: 9  },
  { dialCode: '+355', iso2: 'AL', name: 'Albania',               flag: '🇦🇱', minLength: 9,  maxLength: 9  },
  { dialCode: '+213', iso2: 'DZ', name: 'Algeria',               flag: '🇩🇿', minLength: 9,  maxLength: 9  },
  { dialCode: '+1',   iso2: 'AS', name: 'American Samoa',        flag: '🇦🇸', minLength: 10, maxLength: 10 },
  { dialCode: '+376', iso2: 'AD', name: 'Andorra',               flag: '🇦🇩', minLength: 6,  maxLength: 9  },
  { dialCode: '+244', iso2: 'AO', name: 'Angola',                flag: '🇦🇴', minLength: 9,  maxLength: 9  },
  { dialCode: '+1',   iso2: 'AI', name: 'Anguilla',              flag: '🇦🇮', minLength: 10, maxLength: 10 },
  { dialCode: '+1',   iso2: 'AG', name: 'Antigua & Barbuda',     flag: '🇦🇬', minLength: 10, maxLength: 10 },
  { dialCode: '+54',  iso2: 'AR', name: 'Argentina',             flag: '🇦🇷', minLength: 10, maxLength: 11 },
  { dialCode: '+374', iso2: 'AM', name: 'Armenia',               flag: '🇦🇲', minLength: 8,  maxLength: 8  },
  { dialCode: '+297', iso2: 'AW', name: 'Aruba',                 flag: '🇦🇼', minLength: 7,  maxLength: 7  },
  { dialCode: '+61',  iso2: 'AU', name: 'Australia',             flag: '🇦🇺', minLength: 9,  maxLength: 9  },
  { dialCode: '+43',  iso2: 'AT', name: 'Austria',               flag: '🇦🇹', minLength: 7,  maxLength: 13 },
  { dialCode: '+994', iso2: 'AZ', name: 'Azerbaijan',            flag: '🇦🇿', minLength: 9,  maxLength: 9  },
  { dialCode: '+1',   iso2: 'BS', name: 'Bahamas',               flag: '🇧🇸', minLength: 10, maxLength: 10 },
  { dialCode: '+973', iso2: 'BH', name: 'Bahrain',               flag: '🇧🇭', minLength: 8,  maxLength: 8  },
  { dialCode: '+880', iso2: 'BD', name: 'Bangladesh',            flag: '🇧🇩', minLength: 10, maxLength: 10 },
  { dialCode: '+1',   iso2: 'BB', name: 'Barbados',              flag: '🇧🇧', minLength: 10, maxLength: 10 },
  { dialCode: '+375', iso2: 'BY', name: 'Belarus',               flag: '🇧🇾', minLength: 9,  maxLength: 11 },
  { dialCode: '+32',  iso2: 'BE', name: 'Belgium',               flag: '🇧🇪', minLength: 9,  maxLength: 9  },
  { dialCode: '+501', iso2: 'BZ', name: 'Belize',                flag: '🇧🇿', minLength: 7,  maxLength: 7  },
  { dialCode: '+229', iso2: 'BJ', name: 'Benin',                 flag: '🇧🇯', minLength: 8,  maxLength: 8  },
  { dialCode: '+1',   iso2: 'BM', name: 'Bermuda',               flag: '🇧🇲', minLength: 10, maxLength: 10 },
  { dialCode: '+975', iso2: 'BT', name: 'Bhutan',                flag: '🇧🇹', minLength: 8,  maxLength: 8  },
  { dialCode: '+591', iso2: 'BO', name: 'Bolivia',               flag: '🇧🇴', minLength: 8,  maxLength: 8  },
  { dialCode: '+387', iso2: 'BA', name: 'Bosnia & Herzegovina',  flag: '🇧🇦', minLength: 8,  maxLength: 9  },
  { dialCode: '+267', iso2: 'BW', name: 'Botswana',              flag: '🇧🇼', minLength: 8,  maxLength: 8  },
  { dialCode: '+55',  iso2: 'BR', name: 'Brazil',                flag: '🇧🇷', minLength: 10, maxLength: 11 },
  { dialCode: '+246', iso2: 'IO', name: 'British Indian Ocean',  flag: '🇮🇴', minLength: 7,  maxLength: 7  },
  { dialCode: '+1',   iso2: 'VG', name: 'British Virgin Islands',flag: '🇻🇬', minLength: 10, maxLength: 10 },
  { dialCode: '+673', iso2: 'BN', name: 'Brunei',                flag: '🇧🇳', minLength: 7,  maxLength: 7  },
  { dialCode: '+359', iso2: 'BG', name: 'Bulgaria',              flag: '🇧🇬', minLength: 9,  maxLength: 9  },
  { dialCode: '+226', iso2: 'BF', name: 'Burkina Faso',          flag: '🇧🇫', minLength: 8,  maxLength: 8  },
  { dialCode: '+257', iso2: 'BI', name: 'Burundi',               flag: '🇧🇮', minLength: 8,  maxLength: 8  },
  { dialCode: '+238', iso2: 'CV', name: 'Cabo Verde',            flag: '🇨🇻', minLength: 7,  maxLength: 7  },
  { dialCode: '+855', iso2: 'KH', name: 'Cambodia',              flag: '🇰🇭', minLength: 8,  maxLength: 9  },
  { dialCode: '+237', iso2: 'CM', name: 'Cameroon',              flag: '🇨🇲', minLength: 9,  maxLength: 9  },
  { dialCode: '+1',   iso2: 'CA', name: 'Canada',                flag: '🇨🇦', minLength: 10, maxLength: 10 },
  { dialCode: '+1',   iso2: 'KY', name: 'Cayman Islands',        flag: '🇰🇾', minLength: 10, maxLength: 10 },
  { dialCode: '+236', iso2: 'CF', name: 'Central African Rep.',  flag: '🇨🇫', minLength: 8,  maxLength: 8  },
  { dialCode: '+235', iso2: 'TD', name: 'Chad',                  flag: '🇹🇩', minLength: 8,  maxLength: 8  },
  { dialCode: '+56',  iso2: 'CL', name: 'Chile',                 flag: '🇨🇱', minLength: 9,  maxLength: 9  },
  { dialCode: '+86',  iso2: 'CN', name: 'China',                 flag: '🇨🇳', minLength: 11, maxLength: 11 },
  { dialCode: '+57',  iso2: 'CO', name: 'Colombia',              flag: '🇨🇴', minLength: 10, maxLength: 10 },
  { dialCode: '+269', iso2: 'KM', name: 'Comoros',               flag: '🇰🇲', minLength: 7,  maxLength: 7  },
  { dialCode: '+242', iso2: 'CG', name: 'Congo',                 flag: '🇨🇬', minLength: 9,  maxLength: 9  },
  { dialCode: '+243', iso2: 'CD', name: 'Congo (DRC)',           flag: '🇨🇩', minLength: 9,  maxLength: 9  },
  { dialCode: '+682', iso2: 'CK', name: 'Cook Islands',          flag: '🇨🇰', minLength: 5,  maxLength: 5  },
  { dialCode: '+506', iso2: 'CR', name: 'Costa Rica',            flag: '🇨🇷', minLength: 8,  maxLength: 8  },
  { dialCode: '+225', iso2: 'CI', name: "Côte d'Ivoire",         flag: '🇨🇮', minLength: 10, maxLength: 10 },
  { dialCode: '+385', iso2: 'HR', name: 'Croatia',               flag: '🇭🇷', minLength: 9,  maxLength: 9  },
  { dialCode: '+53',  iso2: 'CU', name: 'Cuba',                  flag: '🇨🇺', minLength: 8,  maxLength: 8  },
  { dialCode: '+357', iso2: 'CY', name: 'Cyprus',                flag: '🇨🇾', minLength: 8,  maxLength: 8  },
  { dialCode: '+420', iso2: 'CZ', name: 'Czech Republic',        flag: '🇨🇿', minLength: 9,  maxLength: 9  },
  { dialCode: '+45',  iso2: 'DK', name: 'Denmark',               flag: '🇩🇰', minLength: 8,  maxLength: 8  },
  { dialCode: '+253', iso2: 'DJ', name: 'Djibouti',              flag: '🇩🇯', minLength: 8,  maxLength: 8  },
  { dialCode: '+1',   iso2: 'DM', name: 'Dominica',              flag: '🇩🇲', minLength: 10, maxLength: 10 },
  { dialCode: '+1',   iso2: 'DO', name: 'Dominican Republic',    flag: '🇩🇴', minLength: 10, maxLength: 10 },
  { dialCode: '+593', iso2: 'EC', name: 'Ecuador',               flag: '🇪🇨', minLength: 9,  maxLength: 9  },
  { dialCode: '+20',  iso2: 'EG', name: 'Egypt',                 flag: '🇪🇬', minLength: 10, maxLength: 10 },
  { dialCode: '+503', iso2: 'SV', name: 'El Salvador',           flag: '🇸🇻', minLength: 8,  maxLength: 8  },
  { dialCode: '+240', iso2: 'GQ', name: 'Equatorial Guinea',     flag: '🇬🇶', minLength: 9,  maxLength: 9  },
  { dialCode: '+291', iso2: 'ER', name: 'Eritrea',               flag: '🇪🇷', minLength: 7,  maxLength: 7  },
  { dialCode: '+372', iso2: 'EE', name: 'Estonia',               flag: '🇪🇪', minLength: 7,  maxLength: 8  },
  { dialCode: '+268', iso2: 'SZ', name: 'Eswatini',              flag: '🇸🇿', minLength: 8,  maxLength: 8  },
  { dialCode: '+251', iso2: 'ET', name: 'Ethiopia',              flag: '🇪🇹', minLength: 9,  maxLength: 9  },
  { dialCode: '+500', iso2: 'FK', name: 'Falkland Islands',      flag: '🇫🇰', minLength: 5,  maxLength: 5  },
  { dialCode: '+298', iso2: 'FO', name: 'Faroe Islands',         flag: '🇫🇴', minLength: 6,  maxLength: 6  },
  { dialCode: '+679', iso2: 'FJ', name: 'Fiji',                  flag: '🇫🇯', minLength: 7,  maxLength: 7  },
  { dialCode: '+358', iso2: 'FI', name: 'Finland',               flag: '🇫🇮', minLength: 9,  maxLength: 11 },
  { dialCode: '+33',  iso2: 'FR', name: 'France',                flag: '🇫🇷', minLength: 9,  maxLength: 9  },
  { dialCode: '+594', iso2: 'GF', name: 'French Guiana',         flag: '🇬🇫', minLength: 9,  maxLength: 9  },
  { dialCode: '+689', iso2: 'PF', name: 'French Polynesia',      flag: '🇵🇫', minLength: 8,  maxLength: 8  },
  { dialCode: '+241', iso2: 'GA', name: 'Gabon',                 flag: '🇬🇦', minLength: 7,  maxLength: 8  },
  { dialCode: '+220', iso2: 'GM', name: 'Gambia',                flag: '🇬🇲', minLength: 7,  maxLength: 7  },
  { dialCode: '+995', iso2: 'GE', name: 'Georgia',               flag: '🇬🇪', minLength: 9,  maxLength: 9  },
  { dialCode: '+49',  iso2: 'DE', name: 'Germany',               flag: '🇩🇪', minLength: 10, maxLength: 11 },
  { dialCode: '+233', iso2: 'GH', name: 'Ghana',                 flag: '🇬🇭', minLength: 9,  maxLength: 9  },
  { dialCode: '+350', iso2: 'GI', name: 'Gibraltar',             flag: '🇬🇮', minLength: 8,  maxLength: 8  },
  { dialCode: '+30',  iso2: 'GR', name: 'Greece',                flag: '🇬🇷', minLength: 10, maxLength: 10 },
  { dialCode: '+299', iso2: 'GL', name: 'Greenland',             flag: '🇬🇱', minLength: 6,  maxLength: 6  },
  { dialCode: '+1',   iso2: 'GD', name: 'Grenada',               flag: '🇬🇩', minLength: 10, maxLength: 10 },
  { dialCode: '+590', iso2: 'GP', name: 'Guadeloupe',            flag: '🇬🇵', minLength: 9,  maxLength: 9  },
  { dialCode: '+1',   iso2: 'GU', name: 'Guam',                  flag: '🇬🇺', minLength: 10, maxLength: 10 },
  { dialCode: '+502', iso2: 'GT', name: 'Guatemala',             flag: '🇬🇹', minLength: 8,  maxLength: 8  },
  { dialCode: '+44',  iso2: 'GG', name: 'Guernsey',              flag: '🇬🇬', minLength: 10, maxLength: 10 },
  { dialCode: '+224', iso2: 'GN', name: 'Guinea',                flag: '🇬🇳', minLength: 9,  maxLength: 9  },
  { dialCode: '+245', iso2: 'GW', name: 'Guinea-Bissau',         flag: '🇬🇼', minLength: 9,  maxLength: 9  },
  { dialCode: '+592', iso2: 'GY', name: 'Guyana',                flag: '🇬🇾', minLength: 7,  maxLength: 7  },
  { dialCode: '+509', iso2: 'HT', name: 'Haiti',                 flag: '🇭🇹', minLength: 8,  maxLength: 8  },
  { dialCode: '+504', iso2: 'HN', name: 'Honduras',              flag: '🇭🇳', minLength: 8,  maxLength: 8  },
  { dialCode: '+852', iso2: 'HK', name: 'Hong Kong',             flag: '🇭🇰', minLength: 8,  maxLength: 8  },
  { dialCode: '+36',  iso2: 'HU', name: 'Hungary',               flag: '🇭🇺', minLength: 9,  maxLength: 9  },
  { dialCode: '+354', iso2: 'IS', name: 'Iceland',               flag: '🇮🇸', minLength: 7,  maxLength: 7  },
  { dialCode: '+91',  iso2: 'IN', name: 'India',                 flag: '🇮🇳', minLength: 10, maxLength: 10 },
  { dialCode: '+62',  iso2: 'ID', name: 'Indonesia',             flag: '🇮🇩', minLength: 9,  maxLength: 12 },
  { dialCode: '+98',  iso2: 'IR', name: 'Iran',                  flag: '🇮🇷', minLength: 10, maxLength: 10 },
  { dialCode: '+964', iso2: 'IQ', name: 'Iraq',                  flag: '🇮🇶', minLength: 10, maxLength: 10 },
  { dialCode: '+353', iso2: 'IE', name: 'Ireland',               flag: '🇮🇪', minLength: 9,  maxLength: 9  },
  { dialCode: '+44',  iso2: 'IM', name: 'Isle of Man',           flag: '🇮🇲', minLength: 10, maxLength: 10 },
  { dialCode: '+972', iso2: 'IL', name: 'Israel',                flag: '🇮🇱', minLength: 9,  maxLength: 9  },
  { dialCode: '+39',  iso2: 'IT', name: 'Italy',                 flag: '🇮🇹', minLength: 9,  maxLength: 11 },
  { dialCode: '+1',   iso2: 'JM', name: 'Jamaica',               flag: '🇯🇲', minLength: 10, maxLength: 10 },
  { dialCode: '+81',  iso2: 'JP', name: 'Japan',                 flag: '🇯🇵', minLength: 10, maxLength: 11 },
  { dialCode: '+44',  iso2: 'JE', name: 'Jersey',                flag: '🇯🇪', minLength: 10, maxLength: 10 },
  { dialCode: '+962', iso2: 'JO', name: 'Jordan',                flag: '🇯🇴', minLength: 9,  maxLength: 9  },
  { dialCode: '+7',   iso2: 'KZ', name: 'Kazakhstan',            flag: '🇰🇿', minLength: 10, maxLength: 10 },
  { dialCode: '+254', iso2: 'KE', name: 'Kenya',                 flag: '🇰🇪', minLength: 9,  maxLength: 9  },
  { dialCode: '+686', iso2: 'KI', name: 'Kiribati',              flag: '🇰🇮', minLength: 8,  maxLength: 8  },
  { dialCode: '+383', iso2: 'XK', name: 'Kosovo',                flag: '🇽🇰', minLength: 9,  maxLength: 9  },
  { dialCode: '+965', iso2: 'KW', name: 'Kuwait',                flag: '🇰🇼', minLength: 8,  maxLength: 8  },
  { dialCode: '+996', iso2: 'KG', name: 'Kyrgyzstan',            flag: '🇰🇬', minLength: 9,  maxLength: 9  },
  { dialCode: '+856', iso2: 'LA', name: 'Laos',                  flag: '🇱🇦', minLength: 9,  maxLength: 9  },
  { dialCode: '+371', iso2: 'LV', name: 'Latvia',                flag: '🇱🇻', minLength: 8,  maxLength: 8  },
  { dialCode: '+961', iso2: 'LB', name: 'Lebanon',               flag: '🇱🇧', minLength: 7,  maxLength: 8  },
  { dialCode: '+266', iso2: 'LS', name: 'Lesotho',               flag: '🇱🇸', minLength: 8,  maxLength: 8  },
  { dialCode: '+231', iso2: 'LR', name: 'Liberia',               flag: '🇱🇷', minLength: 7,  maxLength: 8  },
  { dialCode: '+218', iso2: 'LY', name: 'Libya',                 flag: '🇱🇾', minLength: 9,  maxLength: 9  },
  { dialCode: '+423', iso2: 'LI', name: 'Liechtenstein',         flag: '🇱🇮', minLength: 7,  maxLength: 9  },
  { dialCode: '+370', iso2: 'LT', name: 'Lithuania',             flag: '🇱🇹', minLength: 8,  maxLength: 8  },
  { dialCode: '+352', iso2: 'LU', name: 'Luxembourg',            flag: '🇱🇺', minLength: 9,  maxLength: 9  },
  { dialCode: '+853', iso2: 'MO', name: 'Macao',                 flag: '🇲🇴', minLength: 8,  maxLength: 8  },
  { dialCode: '+261', iso2: 'MG', name: 'Madagascar',            flag: '🇲🇬', minLength: 9,  maxLength: 9  },
  { dialCode: '+265', iso2: 'MW', name: 'Malawi',                flag: '🇲🇼', minLength: 9,  maxLength: 9  },
  { dialCode: '+60',  iso2: 'MY', name: 'Malaysia',              flag: '🇲🇾', minLength: 9,  maxLength: 10 },
  { dialCode: '+960', iso2: 'MV', name: 'Maldives',              flag: '🇲🇻', minLength: 7,  maxLength: 7  },
  { dialCode: '+223', iso2: 'ML', name: 'Mali',                  flag: '🇲🇱', minLength: 8,  maxLength: 8  },
  { dialCode: '+356', iso2: 'MT', name: 'Malta',                 flag: '🇲🇹', minLength: 8,  maxLength: 8  },
  { dialCode: '+692', iso2: 'MH', name: 'Marshall Islands',      flag: '🇲🇭', minLength: 7,  maxLength: 7  },
  { dialCode: '+596', iso2: 'MQ', name: 'Martinique',            flag: '🇲🇶', minLength: 9,  maxLength: 9  },
  { dialCode: '+222', iso2: 'MR', name: 'Mauritania',            flag: '🇲🇷', minLength: 8,  maxLength: 8  },
  { dialCode: '+230', iso2: 'MU', name: 'Mauritius',             flag: '🇲🇺', minLength: 8,  maxLength: 8  },
  { dialCode: '+269', iso2: 'YT', name: 'Mayotte',               flag: '🇾🇹', minLength: 9,  maxLength: 9  },
  { dialCode: '+52',  iso2: 'MX', name: 'Mexico',                flag: '🇲🇽', minLength: 10, maxLength: 10 },
  { dialCode: '+691', iso2: 'FM', name: 'Micronesia',            flag: '🇫🇲', minLength: 7,  maxLength: 7  },
  { dialCode: '+373', iso2: 'MD', name: 'Moldova',               flag: '🇲🇩', minLength: 8,  maxLength: 8  },
  { dialCode: '+377', iso2: 'MC', name: 'Monaco',                flag: '🇲🇨', minLength: 8,  maxLength: 9  },
  { dialCode: '+976', iso2: 'MN', name: 'Mongolia',              flag: '🇲🇳', minLength: 8,  maxLength: 8  },
  { dialCode: '+382', iso2: 'ME', name: 'Montenegro',            flag: '🇲🇪', minLength: 8,  maxLength: 8  },
  { dialCode: '+1',   iso2: 'MS', name: 'Montserrat',            flag: '🇲🇸', minLength: 10, maxLength: 10 },
  { dialCode: '+212', iso2: 'MA', name: 'Morocco',               flag: '🇲🇦', minLength: 9,  maxLength: 9  },
  { dialCode: '+258', iso2: 'MZ', name: 'Mozambique',            flag: '🇲🇿', minLength: 9,  maxLength: 9  },
  { dialCode: '+95',  iso2: 'MM', name: 'Myanmar',               flag: '🇲🇲', minLength: 8,  maxLength: 10 },
  { dialCode: '+264', iso2: 'NA', name: 'Namibia',               flag: '🇳🇦', minLength: 9,  maxLength: 9  },
  { dialCode: '+674', iso2: 'NR', name: 'Nauru',                 flag: '🇳🇷', minLength: 7,  maxLength: 7  },
  { dialCode: '+977', iso2: 'NP', name: 'Nepal',                 flag: '🇳🇵', minLength: 10, maxLength: 10 },
  { dialCode: '+31',  iso2: 'NL', name: 'Netherlands',           flag: '🇳🇱', minLength: 9,  maxLength: 9  },
  { dialCode: '+687', iso2: 'NC', name: 'New Caledonia',         flag: '🇳🇨', minLength: 6,  maxLength: 6  },
  { dialCode: '+64',  iso2: 'NZ', name: 'New Zealand',           flag: '🇳🇿', minLength: 8,  maxLength: 10 },
  { dialCode: '+505', iso2: 'NI', name: 'Nicaragua',             flag: '🇳🇮', minLength: 8,  maxLength: 8  },
  { dialCode: '+227', iso2: 'NE', name: 'Niger',                 flag: '🇳🇪', minLength: 8,  maxLength: 8  },
  { dialCode: '+234', iso2: 'NG', name: 'Nigeria',               flag: '🇳🇬', minLength: 8,  maxLength: 10 },
  { dialCode: '+683', iso2: 'NU', name: 'Niue',                  flag: '🇳🇺', minLength: 4,  maxLength: 4  },
  { dialCode: '+672', iso2: 'NF', name: 'Norfolk Island',        flag: '🇳🇫', minLength: 6,  maxLength: 6  },
  { dialCode: '+850', iso2: 'KP', name: 'North Korea',           flag: '🇰🇵', minLength: 9,  maxLength: 10 },
  { dialCode: '+389', iso2: 'MK', name: 'North Macedonia',       flag: '🇲🇰', minLength: 8,  maxLength: 8  },
  { dialCode: '+1',   iso2: 'MP', name: 'Northern Mariana Is.',  flag: '🇲🇵', minLength: 10, maxLength: 10 },
  { dialCode: '+47',  iso2: 'NO', name: 'Norway',                flag: '🇳🇴', minLength: 8,  maxLength: 8  },
  { dialCode: '+968', iso2: 'OM', name: 'Oman',                  flag: '🇴🇲', minLength: 8,  maxLength: 8  },
  { dialCode: '+92',  iso2: 'PK', name: 'Pakistan',              flag: '🇵🇰', minLength: 10, maxLength: 10 },
  { dialCode: '+680', iso2: 'PW', name: 'Palau',                 flag: '🇵🇼', minLength: 7,  maxLength: 7  },
  { dialCode: '+970', iso2: 'PS', name: 'Palestine',             flag: '🇵🇸', minLength: 9,  maxLength: 9  },
  { dialCode: '+507', iso2: 'PA', name: 'Panama',                flag: '🇵🇦', minLength: 8,  maxLength: 8  },
  { dialCode: '+675', iso2: 'PG', name: 'Papua New Guinea',      flag: '🇵🇬', minLength: 8,  maxLength: 8  },
  { dialCode: '+595', iso2: 'PY', name: 'Paraguay',              flag: '🇵🇾', minLength: 9,  maxLength: 9  },
  { dialCode: '+51',  iso2: 'PE', name: 'Peru',                  flag: '🇵🇪', minLength: 9,  maxLength: 9  },
  { dialCode: '+63',  iso2: 'PH', name: 'Philippines',           flag: '🇵🇭', minLength: 10, maxLength: 10 },
  { dialCode: '+48',  iso2: 'PL', name: 'Poland',                flag: '🇵🇱', minLength: 9,  maxLength: 9  },
  { dialCode: '+351', iso2: 'PT', name: 'Portugal',              flag: '🇵🇹', minLength: 9,  maxLength: 9  },
  { dialCode: '+1',   iso2: 'PR', name: 'Puerto Rico',           flag: '🇵🇷', minLength: 10, maxLength: 10 },
  { dialCode: '+974', iso2: 'QA', name: 'Qatar',                 flag: '🇶🇦', minLength: 8,  maxLength: 8  },
  { dialCode: '+262', iso2: 'RE', name: 'Réunion',               flag: '🇷🇪', minLength: 9,  maxLength: 9  },
  { dialCode: '+40',  iso2: 'RO', name: 'Romania',               flag: '🇷🇴', minLength: 10, maxLength: 10 },
  { dialCode: '+7',   iso2: 'RU', name: 'Russia',                flag: '🇷🇺', minLength: 10, maxLength: 10 },
  { dialCode: '+250', iso2: 'RW', name: 'Rwanda',                flag: '🇷🇼', minLength: 9,  maxLength: 9  },
  { dialCode: '+290', iso2: 'SH', name: 'Saint Helena',          flag: '🇸🇭', minLength: 4,  maxLength: 4  },
  { dialCode: '+1',   iso2: 'KN', name: 'Saint Kitts & Nevis',   flag: '🇰🇳', minLength: 10, maxLength: 10 },
  { dialCode: '+1',   iso2: 'LC', name: 'Saint Lucia',           flag: '🇱🇨', minLength: 10, maxLength: 10 },
  { dialCode: '+508', iso2: 'PM', name: 'Saint Pierre & Miquelon',flag:'🇵🇲', minLength: 6,  maxLength: 6  },
  { dialCode: '+1',   iso2: 'VC', name: 'Saint Vincent',         flag: '🇻🇨', minLength: 10, maxLength: 10 },
  { dialCode: '+685', iso2: 'WS', name: 'Samoa',                 flag: '🇼🇸', minLength: 7,  maxLength: 7  },
  { dialCode: '+378', iso2: 'SM', name: 'San Marino',            flag: '🇸🇲', minLength: 8,  maxLength: 10 },
  { dialCode: '+239', iso2: 'ST', name: 'Sao Tome & Principe',   flag: '🇸🇹', minLength: 7,  maxLength: 7  },
  { dialCode: '+966', iso2: 'SA', name: 'Saudi Arabia',          flag: '🇸🇦', minLength: 9,  maxLength: 9  },
  { dialCode: '+221', iso2: 'SN', name: 'Senegal',               flag: '🇸🇳', minLength: 9,  maxLength: 9  },
  { dialCode: '+381', iso2: 'RS', name: 'Serbia',                flag: '🇷🇸', minLength: 9,  maxLength: 12 },
  { dialCode: '+248', iso2: 'SC', name: 'Seychelles',            flag: '🇸🇨', minLength: 7,  maxLength: 7  },
  { dialCode: '+232', iso2: 'SL', name: 'Sierra Leone',          flag: '🇸🇱', minLength: 8,  maxLength: 8  },
  { dialCode: '+65',  iso2: 'SG', name: 'Singapore',             flag: '🇸🇬', minLength: 8,  maxLength: 8  },
  { dialCode: '+1',   iso2: 'SX', name: 'Sint Maarten',          flag: '🇸🇽', minLength: 10, maxLength: 10 },
  { dialCode: '+421', iso2: 'SK', name: 'Slovakia',              flag: '🇸🇰', minLength: 9,  maxLength: 9  },
  { dialCode: '+386', iso2: 'SI', name: 'Slovenia',              flag: '🇸🇮', minLength: 8,  maxLength: 8  },
  { dialCode: '+677', iso2: 'SB', name: 'Solomon Islands',       flag: '🇸🇧', minLength: 7,  maxLength: 7  },
  { dialCode: '+252', iso2: 'SO', name: 'Somalia',               flag: '🇸🇴', minLength: 7,  maxLength: 8  },
  { dialCode: '+27',  iso2: 'ZA', name: 'South Africa',          flag: '🇿🇦', minLength: 9,  maxLength: 9  },
  { dialCode: '+82',  iso2: 'KR', name: 'South Korea',           flag: '🇰🇷', minLength: 9,  maxLength: 11 },
  { dialCode: '+211', iso2: 'SS', name: 'South Sudan',           flag: '🇸🇸', minLength: 9,  maxLength: 9  },
  { dialCode: '+34',  iso2: 'ES', name: 'Spain',                 flag: '🇪🇸', minLength: 9,  maxLength: 9  },
  { dialCode: '+94',  iso2: 'LK', name: 'Sri Lanka',             flag: '🇱🇰', minLength: 9,  maxLength: 9  },
  { dialCode: '+249', iso2: 'SD', name: 'Sudan',                 flag: '🇸🇩', minLength: 9,  maxLength: 9  },
  { dialCode: '+597', iso2: 'SR', name: 'Suriname',              flag: '🇸🇷', minLength: 7,  maxLength: 7  },
  { dialCode: '+46',  iso2: 'SE', name: 'Sweden',                flag: '🇸🇪', minLength: 9,  maxLength: 10 },
  { dialCode: '+41',  iso2: 'CH', name: 'Switzerland',           flag: '🇨🇭', minLength: 9,  maxLength: 9  },
  { dialCode: '+963', iso2: 'SY', name: 'Syria',                 flag: '🇸🇾', minLength: 9,  maxLength: 9  },
  { dialCode: '+886', iso2: 'TW', name: 'Taiwan',                flag: '🇹🇼', minLength: 9,  maxLength: 9  },
  { dialCode: '+992', iso2: 'TJ', name: 'Tajikistan',            flag: '🇹🇯', minLength: 9,  maxLength: 9  },
  { dialCode: '+255', iso2: 'TZ', name: 'Tanzania',              flag: '🇹🇿', minLength: 9,  maxLength: 9  },
  { dialCode: '+66',  iso2: 'TH', name: 'Thailand',              flag: '🇹🇭', minLength: 9,  maxLength: 9  },
  { dialCode: '+670', iso2: 'TL', name: 'Timor-Leste',           flag: '🇹🇱', minLength: 8,  maxLength: 8  },
  { dialCode: '+228', iso2: 'TG', name: 'Togo',                  flag: '🇹🇬', minLength: 8,  maxLength: 8  },
  { dialCode: '+690', iso2: 'TK', name: 'Tokelau',               flag: '🇹🇰', minLength: 4,  maxLength: 4  },
  { dialCode: '+676', iso2: 'TO', name: 'Tonga',                 flag: '🇹🇴', minLength: 7,  maxLength: 7  },
  { dialCode: '+1',   iso2: 'TT', name: 'Trinidad & Tobago',     flag: '🇹🇹', minLength: 10, maxLength: 10 },
  { dialCode: '+216', iso2: 'TN', name: 'Tunisia',               flag: '🇹🇳', minLength: 8,  maxLength: 8  },
  { dialCode: '+90',  iso2: 'TR', name: 'Turkey',                flag: '🇹🇷', minLength: 10, maxLength: 10 },
  { dialCode: '+993', iso2: 'TM', name: 'Turkmenistan',          flag: '🇹🇲', minLength: 8,  maxLength: 8  },
  { dialCode: '+1',   iso2: 'TC', name: 'Turks & Caicos Is.',    flag: '🇹🇨', minLength: 10, maxLength: 10 },
  { dialCode: '+688', iso2: 'TV', name: 'Tuvalu',                flag: '🇹🇻', minLength: 5,  maxLength: 6  },
  { dialCode: '+1',   iso2: 'VI', name: 'U.S. Virgin Islands',   flag: '🇻🇮', minLength: 10, maxLength: 10 },
  { dialCode: '+256', iso2: 'UG', name: 'Uganda',                flag: '🇺🇬', minLength: 9,  maxLength: 9  },
  { dialCode: '+380', iso2: 'UA', name: 'Ukraine',               flag: '🇺🇦', minLength: 9,  maxLength: 9  },
  { dialCode: '+971', iso2: 'AE', name: 'United Arab Emirates',  flag: '🇦🇪', minLength: 9,  maxLength: 9  },
  { dialCode: '+44',  iso2: 'GB', name: 'United Kingdom',        flag: '🇬🇧', minLength: 10, maxLength: 10 },
  { dialCode: '+1',   iso2: 'US', name: 'United States',         flag: '🇺🇸', minLength: 10, maxLength: 10 },
  { dialCode: '+598', iso2: 'UY', name: 'Uruguay',               flag: '🇺🇾', minLength: 9,  maxLength: 9  },
  { dialCode: '+998', iso2: 'UZ', name: 'Uzbekistan',            flag: '🇺🇿', minLength: 9,  maxLength: 9  },
  { dialCode: '+678', iso2: 'VU', name: 'Vanuatu',               flag: '🇻🇺', minLength: 7,  maxLength: 7  },
  { dialCode: '+58',  iso2: 'VE', name: 'Venezuela',             flag: '🇻🇪', minLength: 10, maxLength: 10 },
  { dialCode: '+84',  iso2: 'VN', name: 'Vietnam',               flag: '🇻🇳', minLength: 9,  maxLength: 10 },
  { dialCode: '+681', iso2: 'WF', name: 'Wallis & Futuna',       flag: '🇼🇫', minLength: 6,  maxLength: 6  },
  { dialCode: '+212', iso2: 'EH', name: 'Western Sahara',        flag: '🇪🇭', minLength: 9,  maxLength: 9  },
  { dialCode: '+967', iso2: 'YE', name: 'Yemen',                 flag: '🇾🇪', minLength: 9,  maxLength: 9  },
  { dialCode: '+260', iso2: 'ZM', name: 'Zambia',                flag: '🇿🇲', minLength: 9,  maxLength: 9  },
  { dialCode: '+263', iso2: 'ZW', name: 'Zimbabwe',              flag: '🇿🇼', minLength: 9,  maxLength: 9  },
]

// Default to Tunisia (the app's primary market)
const DEFAULT_COUNTRY = COUNTRIES.find((c) => c.iso2 === 'TN')!

// ─── Validation helper ────────────────────────────────────────────────────────
export function validatePhoneForCountry(digits: string, country: Country): string | null {
  const clean = digits.replace(/\D/g, '')
  if (clean.length === 0) return null // empty — let required check handle it
  if (clean.length < country.minLength) {
    return `Phone number too short for ${country.name} (${country.dialCode}). Expected ${country.minLength} digits.`
  }
  if (clean.length > country.maxLength) {
    return `Phone number too long for ${country.name} (${country.dialCode}). Maximum ${country.maxLength} digits.`
  }
  return null
}

// ─── Component ────────────────────────────────────────────────────────────────
interface PhoneInputProps {
  id?: string
  value: string               // full value including dial code, e.g. "+216 20123456"
  onChange: (fullValue: string, isValid: boolean, country: Country) => void
  error?: string
  onBlurValidate?: (error: string | null) => void
  inputRef?: React.RefCallback<HTMLInputElement>
  ariaDescribedBy?: string
}

export default function PhoneInput({
  id = 'phone',
  value,
  onChange,
  error,
  onBlurValidate,
  inputRef,
  ariaDescribedBy,
}: PhoneInputProps) {
  const [selectedCountry, setSelectedCountry] = useState<Country>(DEFAULT_COUNTRY)
  const [localNumber, setLocalNumber] = useState('')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [touched, setTouched] = useState(false)
  const [inlineError, setInlineError] = useState<string | null>(null)

  const dropdownRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  // Filtered country list
  const filtered = search.trim()
    ? COUNTRIES.filter(
        (c) =>
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.dialCode.includes(search) ||
          c.iso2.toLowerCase().includes(search.toLowerCase())
      )
    : COUNTRIES

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Focus search when dropdown opens
  useEffect(() => {
    if (dropdownOpen) {
      setTimeout(() => searchRef.current?.focus(), 50)
    }
  }, [dropdownOpen])

  const handleCountrySelect = useCallback((country: Country) => {
    setSelectedCountry(country)
    setDropdownOpen(false)
    setSearch('')
    const full = `${country.dialCode} ${localNumber}`
    const validationError = localNumber ? validatePhoneForCountry(localNumber, country) : null
    setInlineError(validationError)
    onChange(full, validationError === null, country)
  }, [localNumber, onChange])

  const handleNumberChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    // Allow only digits, spaces, hyphens, parentheses
    const raw = e.target.value.replace(/[^\d\s\-()]/g, '')
    setLocalNumber(raw)
    const full = `${selectedCountry.dialCode} ${raw}`
    const validationError = raw.trim() ? validatePhoneForCountry(raw, selectedCountry) : null
    if (touched) setInlineError(validationError)
    onChange(full, validationError === null && raw.trim().length > 0, selectedCountry)
  }, [selectedCountry, touched, onChange])

  const handleBlur = useCallback(() => {
    setTouched(true)
    const validationError = localNumber.trim() ? validatePhoneForCountry(localNumber, selectedCountry) : null
    setInlineError(validationError)
    onBlurValidate?.(validationError)
  }, [localNumber, selectedCountry, onBlurValidate])

  // Derive the displayed error (parent field error overrides inline)
  const displayError = error || (touched ? inlineError : null)

  const hasError = !!displayError
  const placeholder = `${selectedCountry.minLength === selectedCountry.maxLength
    ? selectedCountry.minLength
    : `${selectedCountry.minLength}–${selectedCountry.maxLength}`} digits`

  return (
    <div className="relative">
      <div
        className={`flex items-stretch border rounded-xl overflow-visible transition-all duration-200 bg-[#FEFEFE] ${
          hasError
            ? 'border-red-400 ring-1 ring-red-300'
            : 'border-zinc-300 focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-500/30'
        }`}
      >
        {/* ── Country selector button ── */}
        <div className="relative flex-shrink-0" ref={dropdownRef}>
          <button
            type="button"
            aria-haspopup="listbox"
            aria-expanded={dropdownOpen}
            aria-label={`Country code: ${selectedCountry.name} ${selectedCountry.dialCode}`}
            onClick={() => setDropdownOpen((o) => !o)}
            className="flex items-center gap-2 px-3 py-3 h-full border-r border-zinc-200 hover:bg-zinc-50 transition-colors rounded-l-xl text-sm font-medium text-zinc-700 whitespace-nowrap select-none focus:outline-none focus:ring-2 focus:ring-inset focus:ring-orange-500"
          >
            <img
              src={`https://flagcdn.com/w40/${selectedCountry.iso2.toLowerCase()}.png`}
              srcSet={`https://flagcdn.com/w80/${selectedCountry.iso2.toLowerCase()}.png 2x`}
              alt={selectedCountry.name}
              className="w-5 h-auto rounded-sm shadow-sm"
              loading="lazy"
            />
            <span className="text-zinc-500 font-mono text-xs">{selectedCountry.dialCode}</span>
            <svg
              className={`w-3.5 h-3.5 text-zinc-400 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* ── Dropdown ── */}
          {dropdownOpen && (
            <div
              role="listbox"
              aria-label="Select country"
              className="absolute z-50 mt-1 left-0 w-72 bg-white border border-zinc-200 rounded-xl shadow-xl overflow-hidden"
              style={{ top: '100%' }}
            >
              {/* Search */}
              <div className="p-2 border-b border-zinc-100 sticky top-0 bg-white">
                <div className="relative">
                  <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <circle cx="11" cy="11" r="8"/><path strokeLinecap="round" d="M21 21l-4.35-4.35"/>
                  </svg>
                  <input
                    ref={searchRef}
                    type="text"
                    placeholder="Search country or code…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-400 bg-zinc-50 text-zinc-800 placeholder-zinc-400"
                  />
                </div>
              </div>

              {/* Country list */}
              <ul className="max-h-56 overflow-y-auto py-1 scrollbar-thin">
                {filtered.length === 0 ? (
                  <li className="px-4 py-3 text-sm text-zinc-400 text-center">No results</li>
                ) : (
                  filtered.map((c) => (
                    <li
                      key={c.iso2}
                      role="option"
                      aria-selected={c.iso2 === selectedCountry.iso2}
                      onClick={() => handleCountrySelect(c)}
                      className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer text-sm transition-colors ${
                        c.iso2 === selectedCountry.iso2
                          ? 'bg-orange-50 text-orange-700 font-medium'
                          : 'text-zinc-700 hover:bg-zinc-50'
                      }`}
                    >
                      <img
                        src={`https://flagcdn.com/w40/${c.iso2.toLowerCase()}.png`}
                        srcSet={`https://flagcdn.com/w80/${c.iso2.toLowerCase()}.png 2x`}
                        alt={c.name}
                        className="w-5 h-auto rounded-sm shadow-sm flex-shrink-0"
                        loading="lazy"
                      />
                      <span className="flex-1 truncate">{c.name}</span>
                      <span className="font-mono text-xs text-zinc-400 flex-shrink-0">{c.dialCode}</span>
                    </li>
                  ))
                )}
              </ul>
            </div>
          )}
        </div>

        {/* ── Phone number input ── */}
        <input
          id={id}
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          ref={inputRef}
          aria-invalid={hasError}
          aria-describedby={ariaDescribedBy}
          placeholder={placeholder}
          value={localNumber}
          onChange={handleNumberChange}
          onBlur={handleBlur}
          dir="ltr"
          className="flex-1 min-w-0 px-3 py-3 text-base text-zinc-900 placeholder-zinc-400 bg-transparent focus:outline-none rounded-r-xl"
        />

        {/* ── Status icon ── */}
        {localNumber.trim().length > 0 && (
          <div className="flex items-center pr-3 flex-shrink-0">
            {inlineError || error ? (
              <svg className="w-4 h-4 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            ) : !inlineError && touched ? (
              <svg className="w-4 h-4 text-emerald-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            ) : null}
          </div>
        )}
      </div>

      {/* ── Hint: expected length ── */}
      {!displayError && (
        <p className="mt-1 text-xs text-zinc-400">
          {selectedCountry.name}: {selectedCountry.dialCode}{' '}
          +{' '}{selectedCountry.minLength === selectedCountry.maxLength
            ? `${selectedCountry.minLength} digits`
            : `${selectedCountry.minLength}–${selectedCountry.maxLength} digits`}
        </p>
      )}

      {/* ── Error message ── */}
      {displayError && (
        <p
          id={ariaDescribedBy}
          role="alert"
          className="mt-1.5 text-sm text-red-600 flex items-center gap-1.5"
        >
          <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {displayError}
        </p>
      )}
    </div>
  )
}
